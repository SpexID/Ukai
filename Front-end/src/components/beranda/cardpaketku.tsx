/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react';
// import { motion } from 'framer-motion';
import {
  Card,
  CardMedia,
  CardContent,
  Typography,
  Stack,
  Pagination,
  Box,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { tokensSet } from '../../theme/tokens';

// ================== SHAPE ==================
// interface Shape {
//   id: number;
//   x: number;
//   size: number;
//   type: 'circle' | 'square' | 'triangle';
// }

// const GlobalShapes: Shape[] = Array.from({ length: 10 }).map((_, i) => {
//   const types: Shape['type'][] = ['circle', 'square', 'triangle'];
//   return {
//     id: i,
//     x: Math.random() * 100,
//     size: 20 + Math.random() * 200,
//     type: types[Math.floor(Math.random() * types.length)],
//   };
// });

// ================== PACKAGE CARD ==================
// interface PackageCardProps {
//   title: string;
//   palette: typeof tokensSet.palette1;
// }

// function PackageCard({ title, palette }: PackageCardProps) {
//   const [isMobile, setIsMobile] = useState(false);
//   const containerRef = useRef<HTMLDivElement>(null);

//   useEffect(() => {
//     const check = () => setIsMobile(window.innerWidth < 768);
//     check();
//     window.addEventListener('resize', check);
//     return () => window.removeEventListener('resize', check);
//   }, []);

//   const colors = [
//     '#E74C3C',
//     '#3498DB',
//     '#2ECC71',
//     '#9B59B6',
//     '#F39C12',
//     '#1ABC9C',
//     '#34495E',
//   ];
//   const bgColor = colors[Math.floor(Math.random() * colors.length)];

//   return (
//     <Stack
//       ref={containerRef}
//       style={{
//         width: '100%',
//         height: '140px',
//         backgroundColor: bgColor,
//         overflow: 'hidden',
//         position: 'relative',
//       }}
//     >
//       {GlobalShapes.map((s) => {
//         const baseStyle: React.CSSProperties = {
//           left: `${s.x}%`,
//           width: s.size,
//           height: s.size,
//           transform: 'translateX(-50%)',
//           position: 'absolute',
//         };

//         const isFilled = Math.random() > 0.5;
//         let shapeEl;

//         if (s.type === 'circle') {
//           shapeEl = (
//             <div
//               style={{
//                 ...baseStyle,
//                 borderRadius: '50%',
//                 border: isFilled ? 'none' : `3px solid ${palette.textPrimary}`,
//                 background: isFilled ? palette.textPrimary : 'inherit',
//               }}
//             />
//           );
//         } else if (s.type === 'square') {
//           shapeEl = (
//             <div
//               style={{
//                 ...baseStyle,
//                 border: isFilled ? 'none' : `3px solid ${palette.textPrimary}`,
//                 background: isFilled ? palette.textPrimary : 'inherit',
//               }}
//             />
//           );
//         } else {
//           shapeEl = (
//             <div
//               style={{
//                 ...baseStyle,
//                 width: 0,
//                 height: 0,
//                 borderLeft: `${s.size / 2}px solid transparent`,
//                 borderRight: `${s.size / 2}px solid transparent`,
//                 borderBottom: `${s.size}px solid ${palette.textPrimary}`,
//                 background: 'inherit',
//               }}
//             />
//           );
//         }

//         if (!isMobile) {
//           return (
//             <motion.div
//               key={s.id}
//               style={baseStyle}
//               initial={{ top: -250 }}
//               animate={{ top: '200vh' }}
//               transition={{
//                 duration: 18 + Math.random() * 30,
//                 repeat: Infinity,
//                 ease: 'linear',
//                 delay: Math.random() * 100,
//               }}
//             >
//               {shapeEl}
//             </motion.div>
//           );
//         }

//         return (
//           <Stack
//             key={s.id}
//             style={{
//               ...baseStyle,
//               backgroundColor: bgColor,
//               top: `${0 + Math.random() * 60}%`,
//             }}
//           />
//         );
//       })}

//       <Stack
//         height={'100%'}
//         sx={{
//           zIndex: 5,
//           color: isMobile ? 'white' : bgColor,
//           fontSize: '24px',
//           fontWeight: 700,
//           mixBlendMode: 'exclusion',
//           alignItems: 'center',
//           justifyContent: 'center',
//         }}
//       >
//         {title}
//       </Stack>
//     </Stack>
//   );
// }

// ================== GRID UTAMA ==================
interface UserPaket {
  id: string;
  name: string;
  price: number;
  created_at: string;
  image?: string | null;
  closed_at?: string | null;
}

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

export default function PaketGrid() {
  const navigate = useNavigate();
  const [palette, setPalette] = useState(tokensSet.palette1);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const [userPakets, setUserPakets] = useState<UserPaket[]>([]);

  // theme + breakpoints used only for grid behavior & maxWidth rules
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const underOrEqual1440 = useMediaQuery('(max-width:1440px)');
  const isTablet820 = useMediaQuery('(max-width:820px)');
  const isSmallScreen = useMediaQuery('(max-width:420px)');

  useEffect(() => {
    const fetchUserTheme = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await fetch(`${API_BASE}/user`, {
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

    const fetchUserPakets = async () => {
      try {
        const response = await fetch(`${API_BASE}/user-pakets`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        const data: UserPaket[] = await response.json();
        setUserPakets(data);
      } catch (error) {
        console.error('Error fetching user pakets:', error);
      }
    };

    fetchUserTheme();
    fetchUserPakets();
  }, []);

  // reset halaman jika data berubah dan currentPage melebihi totalPages
  useEffect(() => {
    const totalPages = Math.ceil(userPakets.length / itemsPerPage) || 1;
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [userPakets, currentPage]);

  const handleItemClick = (id: string) => {
    navigate(`/paketku?id=${encodeURIComponent(id)}`);
  };

  const totalPages = Math.ceil(userPakets.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = userPakets.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (_event: React.ChangeEvent<unknown>, page: number) => {
    setCurrentPage(page);
  };

  const formatPrice = (price: number) => Number(price).toLocaleString('id-ID');

  const formatDateIndo = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(date);
  };

  const isExpired = (closed_at: string) => new Date(closed_at) < new Date();

  // compute columns same way seperti file pertama (match behaviour)
  const columns = isMobile ? 1 : isTablet820 ? 1 : underOrEqual1440 ? 2 : 3;

  return (
    <Stack
      sx={{
        width: '100%',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
      }}
    >
      {/* GRID: menggunakan CSS grid (mengikuti pola file pertama) */}
      {currentItems.length === 0 ? (
        <Box sx={{ width: '100%' }}>
          <Stack
            sx={{
              width: '100%',
              height: 200,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 3,
              // bgcolor: palette.primary ,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600, color: palette.primaryDark }}>
              Anda belum memiliki paket
            </Typography>
          </Stack>
        </Box>
      ) : (
        <Box
          sx={{
            width: '100%',
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            gap: 2,
            mt: 1,
            alignItems: 'start',
            gridAutoRows: 'auto',
          }}
        >
          {currentItems.map((item, idx) => {
            // justification patterns copied from first file logic
            const justify = idx % 2 === 0 ? 'flex-end' : 'flex-start'; // for 820–1440px
            const justifyXL = ['flex-end', 'center', 'flex-start'][idx % 3]; // for >1441px
            const expired = item.closed_at ? isExpired(item.closed_at) : false;

            return (
              <Box
                key={item.id}
                sx={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'center', // default center
                  // 820px–1440px → pakai justify ganjil/genap
                  '@media (min-width:820px) and (max-width:1440px)': {
                    justifyContent: justify,
                  },
                  // >1441px → pola flex-end → center → flex-start (berulang)
                  '@media (min-width:1441px)': {
                    justifyContent: justifyXL,
                  },
                }}
              >
                <Card
                  sx={{
                    bgcolor: palette.primaryContrastText,
                    borderRadius: 3,
                      border:'1px solid',
          color:  palette.textSecondary,
                    cursor: 'pointer',
                    opacity: expired ? 0.9 : 1,
                    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                    '&:hover': {
                      transform: 'scale(1.03)',
                      boxShadow: '0 8px 20px rgba(0,0,0,0.25)',
                    },
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    width: '100%',
                    maxWidth: underOrEqual1440 ? 378 : 378, // allowed change
                    minWidth: 0,
                  }}
                  onClick={() => handleItemClick(item.id)}
                >
                  {!isSmallScreen && item.image ? (
                    <CardMedia component="img" height="140" image={item.image} alt={item.name} />
                  ) : (
                    // <PackageCard title={item.name} palette={palette} />
                    <Stack></Stack>
                  )}

                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: palette.btnSecondaryText }}>
                      {item.name}
                    </Typography>
                    {item.closed_at ? (
                      isExpired(item.closed_at) ? (
                        <Stack flexDirection={isSmallScreen? 'row' : 'row'}>
                          <Typography
                            variant="body1"
                            sx={{
                              fontWeight: 600,
                              mt: 1,
                              color: palette.error,
                            }}
                          >
                            🗓️
                          </Typography>
                          <Typography
                            variant="body1"
                            sx={{
                              fontWeight: 600,
                              mt: 1,
                              color: palette.error,
                            }}
                          >
                            {formatDateIndo(item.closed_at)}
                          </Typography>
                        </Stack>
                      ) : (
                          <Stack flexDirection={isSmallScreen? 'row' : 'row'}>

                          <Typography
                            variant="body1"
                            sx={{
                              fontWeight: 600,
                              mt: 1,
                              color: palette.warning,
                            }}
                          >
                           🗓️
                          </Typography>
                          <Typography
                            variant="body1"
                            sx={{
                              fontWeight: 600,
                              mt: 1,
                              color: palette.warning,
                            }}
                          >
                            {formatDateIndo(item.closed_at)}
                          </Typography>
                        </Stack>
                      )
                    ) : (
                      <Typography variant="h6" sx={{ fontWeight: 700, mt: 1, color: palette.primary }}>
                        Rp. {formatPrice(item.price)}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Box>
            );
          })}
        </Box>
      )}

      {totalPages > 1 && (
        <Pagination
          count={totalPages}
          page={currentPage}
          onChange={handlePageChange}
          size="large"
          sx={{
            mt: 4,
            alignSelf: 'center',
            '& .MuiPaginationItem-root': {
              color: palette.textPrimary,
              '&.Mui-selected': {
                backgroundColor: palette.primary,
                color: palette.primaryContrastText,
              },
              '&:hover': {
                backgroundColor: palette.primary + '33',
              },
            },
          }}
        />
      )}
    </Stack>
  );
}
