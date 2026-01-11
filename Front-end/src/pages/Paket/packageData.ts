export interface Material {
  type: string;
  title: string;
  url: string;
}

export interface Attempt {
  id: number;
  state: string;
  grade: string;
  submitted: string;
}

export interface TryoutDetail {
  title: string;
  opened: string;
  closed: string;
  attemptsAllowed: number;
  timeLimit: string;
  gradingMethod: string;
  attempts: Attempt[];
  materials: Material[];
}

export interface Task {
  id: number;
  name: string;
  opened: string;
  closed: string;
  materials: Material[];
  details?: TryoutDetail;
}

export interface PackageData {
  id: number;
  name: string;
  price: string;
  tasks: Task[];
}

export const dummyPackages: PackageData[] = [
  {
    id: 1,
    name: 'PAKET TO I',
    price: 'GRATIS',
    tasks: [
      {
        id: 1,
        name: 'TO I (SOAL INGATAN TO NAS NOVEMBER 2024)',
        opened: 'Saturday, 15 March 2025, 11:26 AM',
        closed: 'Friday, 15 August 2025, 11:28 AM',
        materials: [
          {
            type: 'PDF',
            title: 'REVISI PEMBAHASAN TO I',
            url: '/path/to/pdf1.pdf'
          }
        ],
        details: {
          title: 'TO I (SOAL INGATAN TO NAS NOVEMBER 2024)',
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
        ],
        details: {
          title: 'TO 2',
          opened: 'Thursday, 20 March 2025, 12:10 AM',
          closed: 'Friday, 15 August 2025, 12:10 AM',
          attemptsAllowed: 3,
          timeLimit: '1 hour 30 mins',
          gradingMethod: 'Highest grade',
          attempts: [
            {
              id: 1,
              state: 'Finished',
              grade: '85.00',
              submitted: 'Tuesday, 24 June 2025, 10:15 AM'
            }
          ],
          materials: [
            {
              type: 'PDF',
              title: 'REVISI PEMBAHASAN TO 2',
              url: '/path/to/pdf2.pdf'
            }
          ]
        }
      }
    ]
  },
  {
    id: 2,
    name: 'PAKET TO PREMIUM',
    price: '500.000',
    tasks: [
      {
        id: 1,
        name: 'TO PREMIUM 1',
        opened: 'Monday, 1 April 2025, 9:00 AM',
        closed: 'Friday, 15 August 2025, 11:59 PM',
        materials: [
          {
            type: 'PDF',
            title: 'PEMBAHASAN TO PREMIUM 1',
            url: '/path/to/premium1.pdf'
          }
        ]
      }
    ]
  }
];