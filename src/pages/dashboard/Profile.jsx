import { useState } from 'react';
import { User, Lock, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const Profile = ({ user, setUser }) => {
  const [formData, setFormData] = useState({
    id: user?.id,
    name: user?.name || '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password && formData.password !== formData.confirmPassword) {
      toast.error('Password baru dan konfirmasi tidak cocok.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/user/profile.php', {
        id: formData.id,
        name: formData.name,
        password: formData.password
      });

      if (response.data.status === 'success') {
        toast.success('Profil berhasil diperbarui!');
        const updatedUser = { ...user, name: formData.name };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
      }
    } catch (error) {
      toast.error('Gagal memperbarui profil.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Pengaturan Profil</h1>
        <p className="text-gray-500 dark:text-gray-400">Perbarui informasi akun dan ganti password Anda.</p>
      </div>

      <div className="glass-panel p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="flex items-center gap-4 pb-6 border-b border-gray-200 dark:border-gray-700/50">
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary/50">
              <User size={40} className="text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{user?.username}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Administrator</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">Nama Lengkap</label>
            <input 
              type="text" 
              className="input-field" 
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
            />
          </div>

          <div>
            <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4 mt-8 flex items-center gap-2">
              <Lock size={18} className="text-accent" /> Ganti Password (Opsional)
            </h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1.5">Password Baru</label>
                <input 
                  type="password" 
                  className="input-field" 
                  placeholder="Kosongkan jika tidak ingin mengubah"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1.5">Konfirmasi Password Baru</label>
                <input 
                  type="password" 
                  className="input-field" 
                  placeholder="Ulangi password baru"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-200 dark:border-gray-700/50 flex justify-end">
            <button 
              type="submit" 
              disabled={loading}
              className="btn-primary flex items-center gap-2"
            >
              {loading ? 'Menyimpan...' : <><CheckCircle size={18} /> Simpan Perubahan</>}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default Profile;
