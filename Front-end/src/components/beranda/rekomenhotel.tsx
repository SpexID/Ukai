// RekomenHotel.tsx
import React from 'react';
import { Stack, Typography, Card, CardActionArea, CardContent, CardMedia } from '@mui/material';
import StarIcon from '@mui/icons-material/Star';

interface RekomenHotelProps {
  name: string;
  stars: string;
  image: string;
}

export const RekomenHotel: React.FC<RekomenHotelProps> = ({ name, stars, image }) => {
  return (
    <Card sx={{ width: 579, height: 'auto', borderRadius: '60px 40px 60px 60px;', boxShadow: '0px 4px 4px rgba(0, 0, 0, 0.25)' }}>
      <CardActionArea>
        <Stack style={{ position: 'absolute', top: 0, right: 0, background: 'var(--Primary-01, linear-gradient(270deg, #ff8702 0%, #FF010C 100%))', color: 'white', padding: '16px 24px', borderRadius: '0 0 0 15px' }}>
          <Stack justifyContent={'center'}  direction={'row'} gap={1}><StarIcon fontSize='large'/> <Typography fontWeight={'500'} fontSize={'28px'}>{stars}</Typography></Stack>
        </Stack>
        <CardMedia component="img" height='350' width='600' image={image} alt="Hotel" sx={{ borderRadius: '0 0 30px' }} />
        <CardContent sx={{ padding: '0px' }}>
          <Stack sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifySelf: 'center',
          }}>
            <Stack>
              <Typography sx={{
                color: '#04214c',
                fontSize: '35px',
                alignItems: 'center',
                alignSelf: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                fontWeight: '500',
                paddingTop: ' 12px',
                paddingBottom: ' 12px'
              }}>
                {name}
              </Typography>
            </Stack>
            <Stack>

            </Stack>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};
