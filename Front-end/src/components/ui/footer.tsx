import { Stack, Typography} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import '@fontsource/poppins/300.css';
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/500.css';
import '@fontsource/poppins/700.css';
import '@fontsource/poppins/800.css';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { tokensSet } from '../../theme/tokens';
import logoTripsel from '../../assets/logoukai.png';
import Ads from '../adsense/ads'
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

export default function NavbarFooter() {
  const navigate = useNavigate();

  const [palette, setThemePalette] = useState(tokensSet.palette1);
interface ThemeFromDB {
  palette: keyof typeof tokensSet;
}

  // 🔹 Fetch tema user agar navbar ikut ganti
  useEffect(() => {
    const fetchTheme = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const res = await axios.get<ThemeFromDB>(`${API_BASE}/user`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.data?.palette && tokensSet[res.data.palette]) {
          setThemePalette(tokensSet[res.data.palette]);
        }
      } catch (err) {
        console.error('Gagal ambil tema', err);
      }
    };

    void fetchTheme();
  }, []);

  const handleSocialMediaClick = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <Stack direction={'column'}>
    <Stack 
  width="100%" 
  sx={{ 
    backgroundColor: palette.primaryContrastText,
    overflow: 'hidden' 
  }}
>
  <Ads />
</Stack>

   
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      sx={{
        width: '100%',
        padding: { xs: '20px', md: '40px' },
        backgroundColor: palette.primaryContrastText,
        color: palette.primaryContrastText,
        alignItems: 'left',
        justifyContent: 'left',
        gap: { xs: 4, md: 10 },
      }}
    >
      {/* LOGO */}
   <Stack
  width={{ xs: 150, sm: 200, md: 200, lg: 260 }}
  alignItems={{ xs: 'center', md: 'flex-start' }}
  justifyContent={{ xs: 'center', md: 'flex-start' }}
  sx={{
    margin: { xs: '0 auto', md: 0 }, // agar auto-center di mobile
  }}
>

        <img
          src={logoTripsel}
          alt="Logo Tripsel"
          style={{ width: '100%', height: 'auto' }}
        />
      </Stack>

      {/* TEXT SECTION */}
      <Stack
        sx={{
          textAlign: { xs: 'center', md: 'left' },
          color: palette.btnSecondaryText,
        }}
      >
        <Typography
          sx={{
            fontWeight: 600,
            fontSize: { xs: 20, md: 24 },
            color: palette.btnSecondaryText,
          }}
        >
          Tentang Kami
        </Typography>

      <Typography
          sx={{
            fontWeight: 400,
            fontSize: { xs: 16, md: 18 },
            paddingTop: 1,
            cursor: 'pointer',
            color: palette.btnSecondaryText,
          }}
          onClick={() =>
           navigate(`/tentang-kami`)
          }
        >
          Rumah Ukai
 </Typography>
        <Typography
          sx={{
            fontWeight: 600,
            fontSize: { xs: 20, md: 24 },
            paddingTop: 4,
            color: palette.btnSecondaryText,
          }}
        >
          Ikuti Rumah Ukai
        </Typography>

        <Typography
          sx={{
            fontWeight: 400,
            fontSize: { xs: 16, md: 18 },
            paddingTop: 1,
            cursor: 'pointer',
            color: palette.btnSecondaryText,
          }}
          onClick={() =>
            handleSocialMediaClick('https://www.instagram.com/rumah.ukai/')
          }
        >
          Instagram
        </Typography>

        <Typography
          sx={{
            fontWeight: 400,
            fontSize: { xs: 16, md: 18 },
            paddingTop: 1,
            cursor: 'pointer',
            color: palette.btnSecondaryText,
          }}
          onClick={() =>
            handleSocialMediaClick('https://www.tiktok.com/@rumah.ukai')
          }
        >
          TikTok
        </Typography>
      </Stack>
    </Stack>
     </Stack>
  );
}
