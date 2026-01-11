import { useEffect, useState } from 'react';
import { 
  Stack, Typography, Button, Divider, 
  Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Paper 
} from '@mui/material';
import { Icon } from '@iconify/react';
import { useNavigate, useSearchParams } from 'react-router-dom';

// ===== INTERFACES AND DUMMY DATA =====
interface Material {
  type: string;
  title: string;
  url: string;
}

interface Attempt {
  id: number;
  state: string;
  grade: string;
  submitted: string;
}

interface TryoutDetailData {
  title: string;
  opened: string;
  closed: string;
  attemptsAllowed: number;
  timeLimit: string;
  gradingMethod: string;
  attempts: Attempt[];
  materials: Material[];
}

interface Task {
  id: number;
  name: string;
  opened: string;
  closed: string;
  materials: Material[];
  details?: TryoutDetailData;
}

interface PackageData {
  id: number;
  name: string;
  price: string;
  tasks: Task[];
}

const dummyPackages: PackageData[] = [
  {
    id: 1,
    name: 'PAKET TO 1',
    price: 'GRATIS',
    tasks: [
      {
        id: 1,
        name: 'TO 1 (SOAL INGATAN TO NAS NOVEMBER 2024)',
        opened: 'Saturday, 15 March 2025, 11:26 AM',
        closed: 'Friday, 15 August 2025, 11:28 AM',
        materials: [
          {
            type: 'PDF',
            title: 'REVISI PEMBAHASAN TO 1',
            url: '/path/to/pdf1.pdf'
          }
        ],
        details: {
          title: 'TO 1 (SOAL INGATAN TO NAS NOVEMBER 2024)',
          opened: 'Saturday, 15 March 2025, 11:28 AM',
          closed: 'Friday, 15 August 2025, 11:28 AM',
          attemptsAllowed: 3,
          timeLimit: '1 hour 40 mins',
          gradingMethod: 'Highest grade',
          attempts: [
            {
              id: 1,
              state: 'Finished',
              grade: '77.00',
              submitted: 'Monday, 23 June 2025, 6:21 PM'
            },
            {
              id: 2,
              state: 'Finished',
              grade: '83.00',
              submitted: 'Wednesday, 25 June 2025, 12:48 PM'
            },
            {
              id: 3,
              state: 'Finished',
              grade: '2.00',
              submitted: 'Monday, 4 August 2025, 11:16 PM'
            }
          ],
          materials: [
            {
              type: 'PDF',
              title: 'REVISI PEMBAHASAN TO 1',
              url: '/path/to/pdf1.pdf'
            }
          ]
        }
      },
      {
        id: 2,
        name: 'TO 2',
        opened: 'Thursday, 20 March 2025, 12:10 AM',
        closed: 'Friday, 15 August 2025, 12:10 AM',
        materials: [
          {
            type: 'PDF',
            title: 'REVISI PEMBAHASAN TO 2',
            url: '/path/to/pdf2.pdf'
          }
        ]
      }
    ]
  }
];

// ===== TRYOUT DETAIL COMPONENT =====
function TryoutDetail({ tryoutData }: { tryoutData: TryoutDetailData }) {
  const navigate = useNavigate();

  const handleBackClick = () => {
    navigate(-1); // Go back to previous page
  };

  const handleStartAttempt = () => {
    navigate(`/tryout?${encodeURIComponent(tryoutData.title)}`);
  };

  return (
    <Stack spacing={4} sx={{ p: 4 }}>
      <Button 
        startIcon={<Icon icon="mdi:arrow-left" />}
        onClick={handleBackClick}
        sx={{ mb: 2 }}
      >
        Back to Package
      </Button>

      <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
        {tryoutData.title}
      </Typography>
      
      <Stack spacing={2}>
        <Typography>
          <strong>Opened:</strong> {tryoutData.opened}
        </Typography>
        <Typography>
          <strong>Closed:</strong> {tryoutData.closed}
        </Typography>
        <Typography>
          <strong>Attempts allowed:</strong> {tryoutData.attemptsAllowed}
        </Typography>
        <Typography>
          <strong>Time limit:</strong> {tryoutData.timeLimit}
        </Typography>
        <Typography>
          <strong>Grading method:</strong> {tryoutData.gradingMethod}
        </Typography>
      </Stack>
      
      <Divider />
      
      <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
        Summary of your previous attempts
      </Typography>
      
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Attempt</TableCell>
              <TableCell>State</TableCell>
              <TableCell>Grade / 100.00</TableCell>
              <TableCell>Review</TableCell>
              <TableCell>Submitted</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tryoutData.attempts.map((attempt) => (
              <TableRow key={attempt.id}>
                <TableCell>{attempt.id}</TableCell>
                <TableCell>{attempt.state}</TableCell>
                <TableCell>{attempt.grade}</TableCell>
                <TableCell>
                  <Button variant="outlined" size="small">
                    Review
                  </Button>
                </TableCell>
                <TableCell>{attempt.submitted}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      
      <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
        Materi Pembahasan
      </Typography>
      
      <Stack spacing={1}>
        {tryoutData.materials.map((material, idx) => (
          <Button
            key={idx}
            variant="outlined"
            startIcon={<Icon icon="vscode-icons:file-type-pdf2" />}
            component="a"
            href={material.url}
            target="_blank"
            sx={{ 
              justifyContent: 'flex-start',
              textTransform: 'none'
            }}
          >
            {material.title} ({material.type})
          </Button>
        ))}
      </Stack>
      
      <Button 
        variant="contained" 
        color="primary" 
        sx={{ mt: 4, alignSelf: 'flex-start' }}
        onClick={handleStartAttempt}
      >
        Start New Attempt
      </Button>
    </Stack>
  );
}

// ===== PACKAGE DETAIL COMPONENT =====
export default function PackageDetail() {
  const [searchParams] = useSearchParams();
  const [packageData, setPackageData] = useState<PackageData | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const packageId = searchParams.get('punyaku');
    const taskId = searchParams.get('task');

    if (!packageId) {
      console.error('Package ID not found');
      return;
    }

    const selectedPackage = dummyPackages.find(pkg => pkg.id === parseInt(packageId));
    if (!selectedPackage) {
      console.error('Package not found');
      return;
    }

    setPackageData(selectedPackage);

    if (taskId) {
      const task = selectedPackage.tasks.find(t => t.id === parseInt(taskId));
      if (task) {
        setSelectedTask(task);
      }
    }
  }, [searchParams]);

  const handleTaskClick = (task: Task) => {
    if (task.details) {
      navigate(`/paketku?punyaku=${packageData?.id}&task=${task.id}`);
    }
  };

  if (!packageData) {
    return <Typography>Loading package data...</Typography>;
  }

  if (selectedTask?.details) {
    return <TryoutDetail tryoutData={selectedTask.details} />;
  }

  return (
    <Stack spacing={4} sx={{ p: 4 }}>
      <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
        {packageData.name}
      </Typography>
      
      <Typography variant="h5" sx={{ color: 'text.secondary' }}>
        Harga: {packageData.price}
      </Typography>
      
      <Divider />
      
      <Typography variant="h4" sx={{ fontWeight: 'bold', mt: 2 }}>
        Daftar Tryout
      </Typography>
      
      <Stack spacing={4}>
        {packageData.tasks.map((task) => (
          <Stack 
            key={task.id} 
            spacing={2} 
            sx={{ 
              p: 3, 
              border: '1px solid #e0e0e0', 
              borderRadius: 2,
              backgroundColor: '#f9f9f9',
              cursor: task.details ? 'pointer' : 'default',
              '&:hover': {
                backgroundColor: task.details ? '#f0f0f0' : '#f9f9f9'
              }
            }}
            onClick={() => task.details && handleTaskClick(task)}
          >
            <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
              {task.name}
            </Typography>
            
            <Stack direction="row" spacing={4}>
              <Typography>
                <strong>Opened:</strong> {task.opened}
              </Typography>
              <Typography>
                <strong>Closed:</strong> {task.closed}
              </Typography>
            </Stack>
            
            {task.materials.length > 0 && (
              <>
                <Typography variant="h6" sx={{ mt: 2, fontWeight: 'bold' }}>
                  Materi Pembahasan:
                </Typography>
                
                <Stack spacing={1}>
                  {task.materials.map((material, idx) => (
                    <Button
                      key={idx}
                      variant="outlined"
                      startIcon={<Icon icon="vscode-icons:file-type-pdf2" />}
                      component="a"
                      href={material.url}
                      target="_blank"
                      onClick={(e) => e.stopPropagation()}
                      sx={{ 
                        justifyContent: 'flex-start',
                        textTransform: 'none'
                      }}
                    >
                      {material.title} ({material.type})
                    </Button>
                  ))}
                </Stack>
              </>
            )}
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
}