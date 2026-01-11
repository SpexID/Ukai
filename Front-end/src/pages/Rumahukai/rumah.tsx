// src/pages/About/About.tsx
import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Stack,
  Card,
  CardContent,
  useTheme,
  useMediaQuery,
  Button,
} from '@mui/material';
import axios from 'axios';
import { tokensSet } from '../../theme/tokens';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

export default function About(): JSX.Element {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [palette, setPalette] = useState(tokensSet.palette1);

  // Fetch tema (palette) user, sama seperti Profile.tsx
  useEffect(() => {
    const fetchUserTheme = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const res = await axios.get(`${API_BASE}/user`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const tema =
          res.data?.tema ??
          res.data?.tema_user ??
          res.data?.theme ??
          null;

        if (tema && tokensSet[tema as keyof typeof tokensSet]) {
          setPalette(tokensSet[tema as keyof typeof tokensSet]);
        }
      } catch (err) {
        console.error('Failed to load theme:', err);
      }
    };
    void fetchUserTheme();
  }, []);

  return (
    <Box
      sx={{
        width: '100%',
  
        bgcolor: palette.primary,
        color: palette.textPrimary,
        display: 'flex',
        justifyContent: 'center',
        p: { xs: 2, sm: 2 },
      }}
    >
      <Card
        sx={{
          width: '100%',
          maxWidth: 1100,
          bgcolor: palette.primaryContrastText,
          borderRadius: 4,
          boxShadow: 4,
        }}
      >
        <CardContent sx={{ p: { xs: 3, sm: 6 } }}>
          {/* Section 1 — Hero Title */}
          <Stack spacing={2} textAlign="center" mb={6} justifyContent={'center'} alignContent={'center'} alignItems={'center'}>
            <Typography
              variant={isMobile ? 'h4' : 'h3'}
              sx={{ fontWeight: 700, color: palette.primary }}
            >
              Tentang <span style={{ color: palette.info }}>Rumah Ukai</span>
            </Typography>

            <Typography
              variant="body1"
              sx={{
                maxWidth: 720,
                mx: 'auto',
                color: palette.btnSecondaryText,
                fontSize: isMobile ? '0.95rem' : '1.1rem',
                textAlign:'center'
              }}
            >
              Kami adalah platform yang membantu mahasiswa Farmasi seluruh
              Indonesia untuk mempersiapkan diri menghadapi{' '}
              <b>Uji Kompetensi Apoteker Indonesia (UKAI)</b> melalui simulasi
              tryout dengan pembahasan yang mendetail, agar Anda dapat belajar dengan lebih cepat,
              efektif, dan terarah.
            </Typography>
          </Stack>

          {/* Section 2 — Mission / Value Cards */}
          <Stack
            direction={isMobile ? 'column' : 'row'}
            spacing={3}
            justifyContent="center"
            mb={8}
          >
            {/* Card 1 */}
            <Box
              sx={{
                flex: 1,
                p: 3,
                borderRadius: 3,
                bgcolor: palette.primaryDark,
                boxShadow: 2,
                textAlign: 'center',
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 700,color: palette.primaryContrastText }}>
                🎯 Misi Kami
              </Typography>

              <Typography
                variant="body2"
                sx={{ mt: 1.5, color: palette.primaryContrastText }}
              >
Meningkatkan keberhasilan peserta UKMPPAI dengan menyediakan pembelajaran yang mudah dipahami, terstruktur, dan sesuai blue print ujian terkini
              </Typography>
            </Box>

            {/* Card 2 */}
            <Box
              sx={{
                flex: 1,
                p: 3,
                borderRadius: 3,
                bgcolor: palette.primaryDark,
                boxShadow: 2,
                textAlign: 'center',
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 700 ,color: palette.primaryContrastText }}>
                📘 Pembahasan Detail
              </Typography>

              <Typography
                variant="body2"
                sx={{ mt: 1.5, color: palette.primaryContrastText }}
              >
                Setiap soal dilengkapi pembahasan rinci untuk membantu Anda
                memahami konsep, bukan menghafal.
              </Typography>
            </Box>

            {/* Card 3 */}
            <Box
              sx={{
                flex: 1,
                p: 3,
                borderRadius: 3,
                bgcolor: palette.primaryDark,
                boxShadow: 2,
                textAlign: 'center',
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 700,color: palette.primaryContrastText  }}>
                💲 Tryout Gratis
              </Typography>

              <Typography
                variant="body2"
                sx={{ mt: 1.5, color: palette.primaryContrastText }}
              >
                Dapatkan paket Tryout Ukai gratis  tiap bulannya untuk mengasah kemampuan tanpa dipungut biaya
              </Typography>
            </Box>
          </Stack>

          {/* Section 3 — CTA */}
          <Stack spacing={2} textAlign="center" alignItems={'center'}>
            <Typography
              variant={isMobile ? 'h5' : 'h4'}
              sx={{ fontWeight: 700, color: palette.primaryDark }}
            >
              Bergabung bersama ratusan mahasiswa yang telah mempercayai{' '}
              Rumah Ukai
            </Typography>

           

            <Button
              variant="contained"
              href="/produk"
              sx={{
                mt: 2,
                bgcolor: palette.primaryDark,
                color: palette.primaryContrastText,
                px: 4,
                py: 1.5,
                borderRadius: 2,
                fontSize: '1rem',
                ':hover': { bgcolor: palette.primaryLight },
              }}
            >
              Mulai Tryout Sekarang
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
