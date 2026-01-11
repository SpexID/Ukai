// src/components/PdfView.tsx
import { useEffect, useState } from 'react';
import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import { useSearchParams } from 'react-router-dom';

interface PdfResponse {
  previewUrl: string;
  viewUrl: string;
  downloadUrl: string;
}

export default function PdfView(): JSX.Element | null {
  const [searchParams] = useSearchParams();
  const tryoutId = searchParams.get('id');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfData, setPdfData] = useState<PdfResponse | null>(null);

  useEffect(() => {
    if (!tryoutId) {
      setError('Tryout ID tidak tersedia');
      setLoading(false);
      return;
    }

    const fetchPdf = async () => {
      try {
        setLoading(true);
        const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:3000';
        const res = await fetch(`${apiBase}/tryout-pdf-url?tryoutId=${encodeURIComponent(tryoutId)}`);
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        const data: PdfResponse = await res.json();

        if (!data.previewUrl) throw new Error('Preview URL tidak tersedia');

        setPdfData(data);
      } catch (err: unknown) {
        console.error(err);
        setError((err as Error).message || 'Gagal memuat PDF');
      } finally {
        setLoading(false);
      }
    };

    fetchPdf();
  }, [tryoutId]);

  if (loading) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ py: 10 }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Memuat dokumen...</Typography>
      </Stack>
    );
  }

  if (error) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ py: 6 }}>
        <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>
        <Typography variant="body2" color="text.secondary">
          Pastikan file Google Drive diset: Anyone with the link – Viewer
        </Typography>
      </Stack>
    );
  }

  if (!pdfData) return null;

  const { previewUrl } = pdfData;

  return (
    <Box
      sx={{
        width: '100%',
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        py: 4,
        px: 2,
        boxSizing: 'border-box',
      }}
    >
      <Box
        sx={{
          width: 'min(1200px, 98%)',
          height: 'calc(100vh - 96px)',
          bgcolor: 'common.white',
          borderRadius: 2,
          boxShadow: 3,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative', // penting untuk overlay absolute
        }}
      >
        {/* Iframe PDF */}
        <Box sx={{ flex: 1, position: 'relative', backgroundColor: '#eee' }}>
          <iframe
            title="PDF Viewer"
            src={previewUrl}
            style={{ width: '100%', height: '100%', border: 'none' }}
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          />
          {/* Overlay merah transparan */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '20%', // 20% dari sisi kanan
              height: '50%',
              backgroundColor: 'rgba(255, 0, 0, 0)',
              pointerEvents: 'auto', // menutup klik di area ini
              zIndex: 10,
            }}
          />
        </Box>
      </Box>
    </Box>
  );
}
