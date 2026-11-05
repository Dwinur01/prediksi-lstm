<?php
require_once '../config/db.php';
require_once '../config/auth.php';

header('Content-Type: application/json; charset=utf-8');
$currentUser = require_auth();
$method = $_SERVER['REQUEST_METHOD'];

function validate_ticket_item($item, $conn, $isUpdate = false, $currentId = null) {
    $errors = [];

    // Tanggal awal minggu (dukung sale_date sebagai alias week_start_date)
    $week_start_date = trim($item['week_start_date'] ?? $item['sale_date'] ?? '');
    if ($week_start_date === '') {
        $errors['week_start_date'] = 'Tanggal minggu wajib diisi';
    } else {
        $dt = DateTime::createFromFormat('Y-m-d', $week_start_date);
        if (!$dt || $dt->format('Y-m-d') !== $week_start_date) {
            $errors['week_start_date'] = 'Format tanggal harus YYYY-MM-DD';
        } else {
            // Periksa duplikasi tanggal
            if ($isUpdate && $currentId) {
                $checkStmt = $conn->prepare("SELECT id FROM ticket_sales WHERE (week_start_date = :wdate OR sale_date = :sdate) AND id != :id LIMIT 1");
                $checkStmt->execute([':wdate' => $week_start_date, ':sdate' => $week_start_date, ':id' => $currentId]);
            } else {
                $checkStmt = $conn->prepare("SELECT id FROM ticket_sales WHERE week_start_date = :wdate OR sale_date = :sdate LIMIT 1");
                $checkStmt->execute([':wdate' => $week_start_date, ':sdate' => $week_start_date]);
            }
            if ($checkStmt->fetch()) {
                $errors['week_start_date'] = 'Tanggal minggu ini sudah ada';
            }
        }
    }

    // Jumlah tiket terjual (harus integer >= 0)
    if (!isset($item['tickets_sold']) || $item['tickets_sold'] === '' || !is_numeric($item['tickets_sold'])) {
        $errors['tickets_sold'] = 'Harus bilangan bulat ≥ 0';
    } else {
        $tickets_sold = (float)$item['tickets_sold'];
        if ($tickets_sold < 0 || floor($tickets_sold) != $tickets_sold) {
            $errors['tickets_sold'] = 'Harus bilangan bulat ≥ 0';
        }
    }

    // Harga tiket (harus lebih besar dari 0)
    if (!isset($item['ticket_price']) || $item['ticket_price'] === '' || !is_numeric($item['ticket_price'])) {
        $errors['ticket_price'] = 'Harus lebih besar dari 0';
    } else {
        $ticket_price = (float)$item['ticket_price'];
        if ($ticket_price <= 0) {
            $errors['ticket_price'] = 'Harus lebih besar dari 0';
        }
    }

    return $errors;
}

function derive_week_and_year($dateStr, $clientWeek = null, $clientYear = null) {
    if (!empty($dateStr)) {
        $dt = DateTime::createFromFormat('Y-m-d', $dateStr);
        if ($dt && $dt->format('Y-m-d') === $dateStr) {
            return [
                'week' => (int)$dt->format('W'),
                'year' => (int)$dt->format('o')
            ];
        }
    }
    return [
        'week' => (int)($clientWeek ?? 1),
        'year' => (int)($clientYear ?? (int)date('Y'))
    ];
}

// Handle GET: Fetch all tickets ordered by week_start_date ASC
if ($method === 'GET') {
    $query = "SELECT id, 
                     COALESCE(week_start_date, sale_date) AS week_start_date, 
                     COALESCE(sale_date, week_start_date) AS sale_date, 
                     week, year, tickets_sold, ticket_price, libur, updated_at, created_at 
              FROM ticket_sales 
              ORDER BY COALESCE(week_start_date, sale_date) ASC, week ASC";
    $stmt = $conn->prepare($query);
    $stmt->execute();
    
    $tickets = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(["status" => "success", "data" => $tickets], JSON_UNESCAPED_UNICODE);
}

// Handle POST: Add new ticket, batch insert, or batch delete
else if ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    if (!is_array($data)) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Format JSON tidak valid."], JSON_UNESCAPED_UNICODE);
        exit();
    }

    $today = date('Ymd');
    $prefix = "tiket-{$today}-";

    function generateNextId($conn, $prefix) {
        $stmt = $conn->prepare("SELECT id FROM ticket_sales WHERE id LIKE :prefix ORDER BY id DESC LIMIT 1");
        $prefixLike = $prefix . '%';
        $stmt->bindParam(':prefix', $prefixLike);
        $stmt->execute();
        $lastId = $stmt->fetchColumn();
        
        if ($lastId) {
            $parts = explode('-', $lastId);
            $lastNum = (int)end($parts);
            $newNum = $lastNum + 1;
        } else {
            $newNum = 1;
        }
        return $prefix . str_pad($newNum, 3, '0', STR_PAD_LEFT);
    }
    
    // Batch delete
    if (isset($data['delete_batch']) && is_array($data['delete_batch'])) {
        try {
            if (empty($data['delete_batch'])) {
                echo json_encode(["status" => "success", "message" => "0 baris dihapus."]);
                exit();
            }
            $placeholders = str_repeat('?,', count($data['delete_batch']) - 1) . '?';
            $query = "DELETE FROM ticket_sales WHERE id IN ($placeholders)";
            $stmt = $conn->prepare($query);
            $stmt->execute($data['delete_batch']);
            echo json_encode(["status" => "success", "message" => count($data['delete_batch']) . " records deleted."]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["status" => "error", "message" => "Delete failed: " . $e->getMessage()]);
        }
    }

    // Batch insert
    else if (isset($data['batch']) && is_array($data['batch'])) {
        // Validasi seluruh item terlebih dahulu sebelum transaksi
        $batchErrors = [];
        foreach ($data['batch'] as $idx => $item) {
            $errs = validate_ticket_item($item, $conn, false, null);
            if (!empty($errs)) {
                $batchErrors[$idx] = $errs;
            }
        }

        if (!empty($batchErrors)) {
            http_response_code(422);
            echo json_encode([
                "status" => "error",
                "message" => "Validasi data batch gagal.",
                "errors" => $batchErrors
            ], JSON_UNESCAPED_UNICODE);
            exit();
        }

        $successCount = 0;
        $conn->beginTransaction();
        try {
            global $db_type;
            if ($db_type === 'sqlite') {
                $query = "INSERT INTO ticket_sales (id, week_start_date, sale_date, week, year, tickets_sold, ticket_price, libur) 
                          VALUES (:id, :wdate, :sdate, :week, :year, :tickets_sold, :ticket_price, :libur)
                          ON CONFLICT(week_start_date) DO UPDATE SET 
                            tickets_sold = excluded.tickets_sold, 
                            ticket_price = excluded.ticket_price, 
                            libur = excluded.libur,
                            sale_date = excluded.sale_date,
                            week = excluded.week, 
                            year = excluded.year";
            } else {
                $query = "INSERT INTO ticket_sales (id, week_start_date, sale_date, week, year, tickets_sold, ticket_price, libur) 
                          VALUES (:id, :wdate, :sdate, :week, :year, :tickets_sold, :ticket_price, :libur)
                          ON DUPLICATE KEY UPDATE 
                            tickets_sold = VALUES(tickets_sold), 
                            ticket_price = VALUES(ticket_price), 
                            libur = VALUES(libur),
                            sale_date = VALUES(sale_date),
                            week = VALUES(week), 
                            year = VALUES(year)";
            }
            $stmt = $conn->prepare($query);
            
            // Urutan penomoran ID
            $stmtLast = $conn->prepare("SELECT id FROM ticket_sales WHERE id LIKE :prefix ORDER BY id DESC LIMIT 1");
            $prefixLike = $prefix . '%';
            $stmtLast->bindParam(':prefix', $prefixLike);
            $stmtLast->execute();
            $lastId = $stmtLast->fetchColumn();
            $nextNum = 1;
            if ($lastId) {
                $parts = explode('-', $lastId);
                $nextNum = (int)end($parts) + 1;
            }

            foreach ($data['batch'] as $item) {
                $generatedId = $prefix . str_pad($nextNum++, 3, '0', STR_PAD_LEFT);
                $wdate = trim($item['week_start_date'] ?? $item['sale_date'] ?? '');
                $sdate = $wdate;
                $derived = derive_week_and_year($wdate, $item['week'] ?? null, $item['year'] ?? null);
                $ticket_price = (float)($item['ticket_price'] ?? 0);
                $tickets_sold = (int)($item['tickets_sold'] ?? 0);
                $libur = isset($item['libur']) ? (int)$item['libur'] : 0;

                $stmt->execute([
                    ':id' => $generatedId,
                    ':wdate' => $wdate,
                    ':sdate' => $sdate,
                    ':week' => $derived['week'],
                    ':year' => $derived['year'],
                    ':tickets_sold' => $tickets_sold,
                    ':ticket_price' => $ticket_price,
                    ':libur' => $libur
                ]);
                $successCount++;
            }
            $conn->commit();
            echo json_encode(["status" => "success", "message" => "$successCount records imported successfully."]);
        } catch (Exception $e) {
            $conn->rollBack();
            http_response_code(500);
            echo json_encode(["status" => "error", "message" => "Import failed: " . $e->getMessage()]);
        }
    } 
    
    // Single insert or update
    else {
        $isUpdate = !empty($data['id']);
        $currentId = $isUpdate ? $data['id'] : null;

        $errors = validate_ticket_item($data, $conn, $isUpdate, $currentId);
        if (!empty($errors)) {
            http_response_code(422);
            echo json_encode([
                "status" => "error",
                "message" => "Validasi gagal.",
                "errors" => $errors
            ], JSON_UNESCAPED_UNICODE);
            exit();
        }

        $id = $isUpdate ? $data['id'] : generateNextId($conn, $prefix);
        $wdate = trim($data['week_start_date'] ?? $data['sale_date'] ?? '');
        $sdate = $wdate;
        $derived = derive_week_and_year($wdate, $data['week'] ?? null, $data['year'] ?? null);
        $ticket_price = (float)$data['ticket_price'];
        $tickets_sold = (int)$data['tickets_sold'];
        $libur = isset($data['libur']) ? (int)$data['libur'] : 0;

        global $db_type;
        if ($db_type === 'sqlite') {
            $query = "INSERT INTO ticket_sales (id, week_start_date, sale_date, week, year, tickets_sold, ticket_price, libur) 
                      VALUES (:id, :wdate, :sdate, :week, :year, :tickets_sold, :ticket_price, :libur)
                      ON CONFLICT(id) DO UPDATE SET 
                        week_start_date = excluded.week_start_date,
                        sale_date = excluded.sale_date,
                        week = excluded.week, 
                        year = excluded.year,
                        tickets_sold = excluded.tickets_sold, 
                        ticket_price = excluded.ticket_price,
                        libur = excluded.libur";
        } else {
            $query = "INSERT INTO ticket_sales (id, week_start_date, sale_date, week, year, tickets_sold, ticket_price, libur) 
                      VALUES (:id, :wdate, :sdate, :week, :year, :tickets_sold, :ticket_price, :libur)
                      ON DUPLICATE KEY UPDATE 
                        week_start_date = VALUES(week_start_date),
                        sale_date = VALUES(sale_date),
                        week = VALUES(week), 
                        year = VALUES(year),
                        tickets_sold = VALUES(tickets_sold), 
                        ticket_price = VALUES(ticket_price),
                        libur = VALUES(libur)";
        }
        
        $stmt = $conn->prepare($query);
        $params = [
            ':id' => $id,
            ':wdate' => $wdate,
            ':sdate' => $sdate,
            ':week' => $derived['week'],
            ':year' => $derived['year'],
            ':tickets_sold' => $tickets_sold,
            ':ticket_price' => $ticket_price,
            ':libur' => $libur
        ];

        if ($stmt->execute($params)) {
            $msg = $isUpdate ? "Record updated" : "Record saved with ID: $id";
            echo json_encode(["status" => "success", "message" => $msg]);
        } else {
            http_response_code(500);
            echo json_encode(["status" => "error", "message" => "Failed to process record."]);
        }
    }
}

// Handle DELETE: Delete a ticket by ID
else if ($method === 'DELETE') {
    $id = $_GET['id'] ?? null;
    
    if ($id) {
        $query = "DELETE FROM ticket_sales WHERE id = :id";
        $stmt = $conn->prepare($query);
        $stmt->bindParam(':id', $id);
        
        if ($stmt->execute()) {
            echo json_encode(["status" => "success", "message" => "Record deleted successfully."]);
        } else {
            http_response_code(500);
            echo json_encode(["status" => "error", "message" => "Failed to delete record."]);
        }
    } else {
        // Reset massal jika ?all=true (T-05: Khusus Admin & Transaksional tanpa TRUNCATE)
        if (isset($_GET['all']) && $_GET['all'] === 'true') {
            require_role('admin');
            try {
                $conn->beginTransaction();
                $stmt = $conn->prepare("DELETE FROM ticket_sales");
                $stmt->execute();
                $conn->commit();
                echo json_encode(["status" => "success", "message" => "All records deleted successfully."]);
            } catch (Exception $e) {
                if ($conn->inTransaction()) {
                    $conn->rollBack();
                }
                http_response_code(500);
                echo json_encode(["status" => "error", "message" => "Failed to delete all records: " . $e->getMessage()]);
            }
        } else {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "ID is required."]);
        }
    }
} else {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method not allowed."]);
}
