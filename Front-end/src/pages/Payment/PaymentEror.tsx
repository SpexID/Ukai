/// <reference types="vite/client" />
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

// gunakan env Vite atau fallback
const API_BASE: string = (import.meta.env.VITE_API_BASE as string) || 'http://localhost:3000';

type StatusResp = {
  order_id?: string;
  status?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  midtrans?: any;
};

const PaymentFinish: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const orderId =
    searchParams.get('orderId') ||
    searchParams.get('order_id') ||
    undefined;
  const trxStatus = searchParams.get('transaction_status');
  const statusCode = searchParams.get('status_code');

  const [status, setStatus] = useState<
    'checking' | 'paid' | 'timeout' | 'error' | 'failed'
  >('checking');
  const [message, setMessage] = useState<string>('Menunggu konfirmasi...');
  const [detail, setDetail] = useState<string>('');

  useEffect(() => {
    if (!orderId) {
      setMessage('Order ID tidak ditemukan.');
      setStatus('error');
      return;
    }

    let stopped = false;
    const token = localStorage.getItem('token');
    const maxTries = 15;
    let tries = 0;

    const check = async () => {
      tries += 1;
      try {
        const resp = await fetch(`${API_BASE}/orders/${orderId}/status`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!resp.ok) {
          console.warn('Status check failed', resp.status);
          setMessage('Gagal memeriksa status dari server.');
          setDetail(`HTTP ${resp.status}`);
        } else {
          const data: StatusResp = await resp.json();
          const s = (data.status || data.midtrans?.transaction_status || '').toString().toUpperCase();

          if (['PAID', 'SETTLEMENT', 'CAPTURE'].includes(s)) {
            setStatus('paid');
            setMessage('🎉 Pembayaran berhasil!');
            setDetail('Paket dapat dicek di halaman Paketku.');
            return;
          } else if (['CANCEL', 'DENY', 'EXPIRE', 'FAILED'].includes(s)) {
            setStatus('failed');
            setMessage('❌ Pembayaran Gagal atau Dibatalkan');
            setDetail('Transaksi tidak dapat diproses. Silakan coba lagi.');
            return;
          } else {
            setMessage('Menunggu konfirmasi pembayaran...');
            setDetail(`Status saat ini: ${s || 'UNKNOWN'}`);
          }
        }
      } catch (err) {
        console.warn('check status error', err);
        setMessage('Terjadi kesalahan saat memeriksa status.');
        setStatus('error');
      }

      if (stopped) return;
      if (tries >= maxTries) {
        setStatus('timeout');
        setMessage('Waktu habis ⏰');
        setDetail('Tidak mendapat konfirmasi pembayaran. Silakan cek kembali nanti.');
        return;
      }

      setTimeout(check, 3000);
    };

    check();
    return () => {
      stopped = true;
    };
  }, [orderId, navigate]);

  // ============ UI Style ==============
  const bgColor =
    status === 'paid' ? '#e6ffed' :
    status === 'failed' ? '#ffeaea' :
    status === 'error' ? '#ffeaea' :
    status === 'timeout' ? '#fff6e6' :
    '#f0f4ff';

  const textColor =
    status === 'paid' ? '#037b26' :
    status === 'failed' ? '#b00020' :
    status === 'error' ? '#b00020' :
    status === 'timeout' ? '#a65e00' :
    '#0038a8';

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#f9fafb',
        padding: '24px',
      }}
    >
      <div
        style={{
          maxWidth: 420,
          width: '100%',
          backgroundColor: bgColor,
          borderRadius: 16,
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
          padding: '32px 24px',
          textAlign: 'center',
          transition: '0.3s ease',
        }}
      >
        <h2 style={{ marginBottom: 16, color: textColor }}>
          {status === 'paid'
            ? '✅ Pembayaran Berhasil'
            : status === 'checking'
            ? '🔄 Memeriksa Status Pembayaran...'
            : status === 'timeout'
            ? '⏰ Waktu Habis'
            : status === 'failed'
            ? '❌ Pembayaran Gagal'
            : '⚠️ Terjadi Kesalahan'}
        </h2>

        <p style={{ marginBottom: 8, color: '#333', fontSize: 16 }}>{message}</p>
        {detail && <p style={{ color: '#555', fontSize: 14 }}>{detail}</p>}

        {status === 'checking' && (
          <div style={{ marginTop: 24 }}>
            <div className="spinner" />
          </div>
        )}

        {status === 'paid' && (
          <button
            onClick={() => navigate('/daftar-paketku')}
            style={{
              marginTop: 24,
              backgroundColor: '#037b26',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 15,
              transition: '0.2s ease',
            }}
            onMouseOver={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = '#049b32';
            }}
            onMouseOut={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = '#037b26';
            }}
          >
            ← Kembali ke Paketku
          </button>
        )}

        {status === 'failed' && (
          <button
            onClick={() => navigate('/paket')}
            style={{
              marginTop: 24,
              backgroundColor: '#b00020',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 15,
              transition: '0.2s ease',
            }}
            onMouseOver={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = '#d61a3c';
            }}
            onMouseOut={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = '#b00020';
            }}
          >
            🔁 Coba Lagi
          </button>
        )}

        <div style={{ marginTop: 24, fontSize: 13, color: '#777' }}>
          Order ID: <b>{orderId}</b>
          {statusCode && <><br />Status Code: {statusCode}</>}
          {trxStatus && <><br />Transaction Status: {trxStatus}</>}
        </div>
      </div>

      {/* Spinner animation */}
      <style>{`
        .spinner {
          margin: 0 auto;
          width: 40px;
          height: 40px;
          border: 4px solid #d0d0d0;
          border-top: 4px solid ${textColor};
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default PaymentFinish;
