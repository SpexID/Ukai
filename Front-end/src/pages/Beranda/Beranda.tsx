import { useEffect, useState } from 'react';
import { Stack, Typography } from '@mui/material';
import RowAndColumnSpacing from '../../components/beranda/cardpaket';
import { tokensSet } from '../../theme/tokens';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

export default function Beranda() {
  const [palette, setPalette] = useState(tokensSet.palette1); // default palette1

  useEffect(() => {
    window.scrollTo(0, 0);

    const fetchUserTheme = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await fetch(`${API_BASE}/user`, {
            method: 'GET',
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (data.tema && typeof data.tema === 'string' && data.tema in tokensSet) {
            setPalette(tokensSet[data.tema as keyof typeof tokensSet]);
          }
        } catch (error) {
          console.error('Error fetching user theme:', error);
        }
      }
    };

    fetchUserTheme();
  }, []);

  return (
    <Stack
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'left',
        marginLeft: '0px',
        backgroundColor: palette.primaryContrastText,
      }}
      gap={0}
    >
      <Stack width={'100%'} marginTop={'0px'} />

      <Stack
        sx={{
          display: 'flex',
          height: 'auto',
          width: 'auto',
          margin: '0',
          borderRadius: '0 0 0px 0px',
          paddingLeft: { xs: '16px', md: '30px' },
        }}
      >
        <Typography
          sx={{
            fontWeight: 500,
            color: palette.btnSecondaryText,
            fontSize: { xs: '28px', sm: '45px', md: '60px' },
            textAlign: 'left',
            width: '100%',
            mt:1,
          }}
        >
          Paket Try out
        </Typography>

        <Typography
          sx={{
            fontWeight: 400,
            color: palette.btnSecondaryText,
            fontSize: { xs: '16px', sm: '20px', md: '25px' },
            textAlign: 'left',
            width: '100%',
          }}
        >
          Paket try out yang tersedia
        </Typography>
      </Stack>

      <Stack
        width="auto"
        height="auto"
        marginLeft={{ xs: '16px', md: '60px' }}
        marginRight={{ xs: '16px', md: '60px' }}
        marginTop="30px"
        marginBottom="55px"
      >
        <RowAndColumnSpacing />
      </Stack>
    </Stack>
  );
}
