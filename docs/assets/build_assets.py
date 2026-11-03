import json, math, datetime as dt
import numpy as np

td=[6,7,8,7,8,8,6,9,10,8,7,6,7,7,7,7,6,7,9,6,7,7,7,7,8,9,7,7,9,10,8,8,8,8,9,9,8,6,8,9,8,8,7,8,9,7,8,8,8,8,9,10,7,7,9,8,8,9,10,8,8,8,9,7,6,7,7]
hg=[850,870,880,860,900,910,890,920,950,940,930,910,870,865,860,855,830,840,870,825,810,815,820,818,850,875,845,840,900,920,895,890,885,880,895,900,870,840,860,880,890,895,875,885,950,920,935,940,855,860,870,890,875,870,895,885,900,915,950,935,870,865,880,855,840,850,845]
libur_weeks={1,4,5,13,14,16,18,19,22,23,26,27,28,33,36,52,53,55,59,64,65,66}
libur=[1 if (i+1) in libur_weeks else 0 for i in range(67)]

TD_MIN,TD_MAX,H_MIN,H_MAX,D_MIN,D_MAX=6,10,810,950,-85,65
W={
'forget':[
[-0.173935,-0.079954,-0.205594,-0.110646,0.059998,0.171497,-0.425545,-0.012781,0.00691,-0.340314,0.459657,0.034173],
[0.002384,-0.048966,-0.295406,-0.346449,0.152541,0.346285,0.170148,-0.337111,-0.28997,0.026456,0.047284,0.076516],
[0.219067,0.242969,0.330494,-0.316328,-0.17933,0.338568,0.062563,-0.295893,0.292002,0.25446,-0.14659,-0.300326],
[0.213656,0.286996,0.049087,0.377156,0.165908,0.608559,0.477096,-0.463434,-0.312992,0.217008,-0.035169,0.611638]],
'input':[
[-0.157187,-0.376649,-0.492032,0.14062,-0.458317,0.031026,-0.032486,0.260705,0.247112,-0.138701,0.093201,0.135418],
[-0.254517,-0.36907,-0.280173,0.375573,0.259325,-0.27436,-0.561139,0.110983,-0.043286,-0.207476,-0.271444,-0.042967],
[-0.31064,0.279885,-0.093077,0.235575,0.264833,0.240721,-0.140897,0.214322,0.028371,-0.323074,0.593377,-0.499778],
[0.190125,0.315035,0.418052,0.178876,0.273729,0.464068,0.295112,0.041072,0.215152,-0.545837,-0.124045,-0.329202]],
'candidate':[
[-0.224978,-0.335091,0.458208,-0.052386,0.127729,0.376992,0.259749,0.294792,-0.03253,0.087567,0.224311,-0.27771],
[0.107109,-0.27556,0.193257,-0.048529,0.47027,0.104175,-0.208704,0.250246,-0.106276,-0.60108,-0.370118,0.017385],
[-0.305462,-0.197377,-0.037856,0.001637,0.093378,-0.042001,-0.039708,-0.174381,-0.103605,0.094225,0.12313,-0.322392],
[-0.475021,-0.534078,-0.279222,-0.27784,0.111859,0.089296,0.236162,0.296973,0.153809,0.616451,0.279245,-0.249292]],
'output':[
[-0.273289,-0.503201,0.309489,0.131311,-0.209288,0.25231,0.140538,0.055861,0.259879,0.429925,0.057655,-0.169824],
[-0.27049,-0.351513,-0.096602,-0.209636,-0.348662,0.235784,0.330542,0.133096,0.213544,0.303926,0.089349,0.031412],
[-0.282273,-0.138518,-0.315576,-0.466051,-0.141958,0.020103,-0.047449,0.356403,-0.133307,-0.366251,-0.13833,-0.347763],
[0.211542,0.033875,0.309301,-0.117941,0.11785,-0.338704,0.324929,0.222032,0.319148,0.226824,-0.457352,0.632498]],
}
Wy=[-0.053968,0.344894,0.329837,-0.531449]; by=0.145061
M={k:np.array(v) for k,v in W.items()}
sig=lambda z:1/(1+np.exp(-z))

tdn=[(v-TD_MIN)/(TD_MAX-TD_MIN) for v in td]
ma3=[np.mean(hg[max(0,i-2):i+1]) for i in range(67)]
hn=[(v-H_MIN)/(H_MAX-H_MIN) for v in ma3]
dl=[0]+[hg[i]-hg[i-1] for i in range(1,67)]
dn=[(v-D_MIN)/(D_MAX-D_MIN) for v in dl]

def x_at(t):  # t = 1-based week
    i=t-1
    def lag(k):
        j=i-k
        return tdn[j] if j>=0 else 0.5   # Minggu 4 pakai 0.5 (nilai imputasi di Excel)
    return [lag(1),lag(2),lag(3),lag(4),hn[i-1],dn[i-1],libur[i]]

h=np.zeros(4); c=np.zeros(4); rows=[]
for t in range(4,68):
    x=np.array(x_at(t)); z=np.concatenate([x,h,[1.0]])
    f=sig(M['forget']@z); ii=sig(M['input']@z); g=np.tanh(M['candidate']@z); o=sig(M['output']@z)
    c=f*c+ii*g; h=o*np.tanh(c)
    yn=float(np.dot(Wy,h)+by); yq=yn*(TD_MAX-TD_MIN)+TD_MIN
    rows.append(dict(week=t,x=x.tolist(),f=f.tolist(),i=ii.tolist(),g=g.tolist(),c=c.tolist(),o=o.tolist(),h=h.tolist(),y_norm=yn,y_qty=yq,actual=td[t-1]))

sheet=[6.8812,7.2016,7.5983,7.8662,8.0111,8.1735,8.1539,8.2373,8.2962,8.4012,8.4332,8.2281,8.3496,8.2000,8.2746,8.2526,8.1246,8.0888,8.2900,8.1531,8.0590,8.0682,8.1944,8.2238,8.2343,8.1966,8.1541,8.1934,8.2371,8.3925,8.2326,8.2402,8.3666,8.2305,8.2574,8.2371,8.2522,8.1786,8.2053,8.2554,8.2350,8.2642,8.2025,8.2537,8.3182,8.2613,8.3496,8.2730,8.3751,8.3398,8.1872,8.3612,8.2117,8.1946,8.2582,8.3715,8.2423,8.2531,8.3503,8.2556,8.3701,8.3054,8.3148,8.1928]
mine=[r['y_qty'] for r in rows]
d=np.abs(np.array(mine)-np.array(sheet))
print('max |selisih| vs sheet Excel:',d.max().round(5),'di minggu',4+int(d.argmax()))
print('row1',[round(v,4) for v in rows[0]['h']],round(rows[0]['y_norm'],4),round(rows[0]['y_qty'],4))
print('row2 c',[round(v,4) for v in rows[1]['c']],round(rows[1]['y_qty'],4))

start=dt.date(2025,1,1)
data=[]
for n in range(1,68):
    s=start+dt.timedelta(days=7*(n-1)); e=s+dt.timedelta(days=6)
    data.append(dict(week_no=n,week_start=s.isoformat(),week_end=e.isoformat(),tickets_sold=td[n-1],ticket_price=hg[n-1],libur=libur[n-1]))
json.dump(dict(description="Dataset penjualan tiket mingguan PT Swabina Gatra (67 minggu, Rabu-Selasa, mulai 2025-01-01). Sumber: Excel lstm_murni_7input.",rows=data),open('dataset_67_minggu.json','w'),indent=1)
json.dump(dict(
 name="lstm_murni_7input",description="Bobot LSTM murni, 7 input, 4 hidden unit, 1 output. Sumber: Excel lstm_murni_7input (hasil training pengguna).",
 feature_order=["td(t-1)","td(t-2)","td(t-3)","td(t-4)","harga_MA3(t-1)","dharga(t-1)","libur(t)"],
 column_order_in_each_gate_row=["x1..x7","h1(t-1)..h4(t-1)","bias"],
 normalization=dict(td=[TD_MIN,TD_MAX],harga=[H_MIN,H_MAX],dharga=[D_MIN,D_MAX]),
 gates=W,Wy=Wy,by=by),open('weights_lstm_murni_7input.json','w'),indent=1)
import csv
with open('golden_forward_pass.csv','w',newline='') as fh:
    w=csv.writer(fh)
    w.writerow(['week','x1','x2','x3','x4','x5','x6','x7','f1','f2','f3','f4','i1','i2','i3','i4','g1','g2','g3','g4','c1','c2','c3','c4','o1','o2','o3','o4','h1','h2','h3','h4','y_norm','y_qty','actual'])
    for r in rows:
        w.writerow([r['week']]+[round(v,6) for k in ['x','f','i','g','c','o','h'] for v in r[k]]+[round(r['y_norm'],6),round(r['y_qty'],6),r['actual']])
