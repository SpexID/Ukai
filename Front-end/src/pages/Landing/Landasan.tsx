/* eslint-disable @typescript-eslint/no-unused-vars */
import { Stack, Typography, Button, Box, Card, CardContent } from '@mui/material';
import { useNavigate } from 'react-router-dom';


import heroImg from '../../assets/tryout2.png';
import { useEffect } from 'react';


const landingPalette = {
  primary: '#C65E2B',
  primaryDark: '#462011',
  primaryContrastText: '#ffffff',
  textPrimary: '#ffffff',
  textSecondary: '#462011',
  sectionBg: '#f7f9fc',
};


export default function LandingPage() {
useEffect(() => {
  window.scrollTo(0, 0);
}, []);


const navigate = useNavigate();


  return (
    <Stack width="100%" sx={{ backgroundColor: landingPalette.primaryContrastText }}>

      {/* ========================================================== */}
      {/* ========================= HERO =========================== */}
      {/* ========================================================== */}
      <Stack width="100%" sx={{ backgroundColor: landingPalette.primary }}>
        <Stack
          width="100%"
          maxWidth="1440px"
          mx="auto"
          px={{ xs: 3, sm: 4, md: 8 }}
          pt={{ xs: 2, sm: 1, md: 3 }}
          pb={{ xs: 0, sm: 0, md: 0 }}
          direction={{ xs: 'column', md: 'row' }}
          alignItems="center"
          justifyContent="space-between"
          gap={{ xs: 4, sm: 2, md: 4 }}
          sx={{
            minHeight: '100vh', // FULLSCREEN SECTION
          }}
        >
          {/* LEFT TEXT */}
          <Stack
            flex={1}
            sx={{
              textAlign: { xs: 'center', md: 'left' },
              alignItems: { xs: 'center', md: 'flex-start' },
              justifyContent: 'center',
              gap: 2,
              maxWidth: { xs: '100%', md: '50%' },
            }}
          >
            <Typography
              sx={{
                fontWeight: 700,
                color: landingPalette.textSecondary,
                fontSize: { xs: '40px', sm: '60px', md: '70px' },
                lineHeight: 1.1,
              }}
            >
              Rumah Ukai
            </Typography>

            <Typography
              sx={{
                fontWeight: 600,
                color: landingPalette.textPrimary,
                fontSize: { xs: '20px', sm: '25px', md: '28px' },
                lineHeight: 1.3,
                maxWidth: '600px',
              }}
            >
              Mari belajar bersama di platform simulasi Tryout UKMPPAI berbasis CBT,
             untuk mendukung persiapan ujian Anda.
            </Typography>

       <Button
  onClick={() => navigate('/login')}
  sx={{
    mt: 2,
    backgroundColor: landingPalette.primaryDark,
    color: '#fff',
    px: 3,
    py: 1.7,
    fontSize: '18px',
    borderRadius: '12px',
    '&:hover': {
      backgroundColor: '#2e130b',
    },
  }}
>
  Daftar Sekarang
</Button>
          </Stack>

          {/* RIGHT IMAGE */}
          <Box flex={1} display="flex" justifyContent="center">
            <img
              src={heroImg}
              alt="Hero"
              style={{
                width: '100%',
                height: 'auto',
                maxWidth: '480px',
                objectFit: 'contain',
                borderRadius: '12px',
              }}
            />
          </Box>
        </Stack>
      </Stack>

      {/* ========================================================== */}
      {/* ===================== SECTION BENEFIT ==================== */}
      {/* ========================================================== */}

      <Stack
        width="100%"
        maxWidth="1440px"
        mx="auto"
        px={{ xs: 3, md: 6 }}
        spacing={6}
        sx={{
          minHeight: '100vh', // FULLSCREEN SECTION 2
          py: 10,
          justifyContent: 'center',
        }}
      >
        <Typography
          textAlign="center"
          sx={{
            fontWeight: 700,
            color: landingPalette.textSecondary,
            fontSize: { xs: '32px', sm: '40px', md: '50px' },
          }}
        >
          Kenapa Memilih Rumah Ukai?
        </Typography>

        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={4}
          justifyContent="space-between"
          alignItems="stretch"
        >
          {[
            {
              title: 'Soal Sesuai Blueprint',
              desc: 'Setiap soal disusun mengikuti blueprint resmi UKMPPAI sehingga latihan Anda jauh lebih terarah.',
            },
            {
              title: 'Pembahasan Detail',
              desc: 'Setiap jawaban dilengkapi pembahasan jelas untuk membantu memahami konsep secara menyeluruh.',
            },
            {
              title: 'Akses di HP & Desktop',
              desc: 'Belajar fleksibel kapan saja, baik menggunakan ponsel maupun perangkat komputer.',
            },
            {
              title: 'Tryout Gratis Tiap Bulan',
              desc: 'Ikuti tryout bulanan tanpa biaya tambahan untuk mengukur progress Anda.',
            },
          ].map((item, i) => (
            <Card
              key={i}
              sx={{
                flex: 1,
                borderRadius: '16px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              }}
            >
              <CardContent>
                <Typography
                  sx={{
                    fontSize: '22px',
                    fontWeight: 700,
                    color: landingPalette.primaryDark,
                    mb: 1,
                  }}
                >
                  {item.title}
                </Typography>
                <Typography sx={{ fontSize: '16px', color: landingPalette.textSecondary }}>
                  {item.desc}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </Stack>

      {/* ========================================================== */}
      {/* ===================== SECTION AJAKAN ===================== */}
      {/* ========================================================== */}

      <Stack
        width="100%"
        sx={{
          backgroundColor: landingPalette.sectionBg,
          minHeight: '100vh', // FULLSCREEN SECTION 3
          py: 10,
          justifyContent: 'center',
        }}
      >
        <Stack
          width="100%"
          maxWidth="1440px"
          mx="auto"
          px={{ xs: 3, md: 6 }}
          alignItems="center"
          textAlign="center"
          spacing={3}
        >
          <Typography
            sx={{
              fontWeight: 700,
              color: landingPalette.textSecondary,
              fontSize: { xs: '32px', sm: '40px', md: '50px' },
              maxWidth: '900px',
              lineHeight: 1.2,
            }}
          >
            Siap Tingkatkan Persiapan UKMPPAI Anda?  
            Mari mulai perjalanan bersama Rumah Ukai.
          </Typography>

          <Button
            href="/produk"
            sx={{
              mt: 2,
              backgroundColor: landingPalette.primary,
              color: '#fff',
              px: 4,
              py: 1.6,
              fontSize: '18px',
              borderRadius: '12px',
              '&:hover': { backgroundColor: landingPalette.primaryDark },
            }}
          >
            Lihat Produk
          </Button>
        </Stack>
      </Stack>

    </Stack>
  );
}
