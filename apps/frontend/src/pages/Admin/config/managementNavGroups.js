import {
  Building2,
  ClipboardCheck,
  Contact,
  Download,
  FileImage,
  FileText,
  Gift,
  LayoutDashboard,
  Mail,
  MapPin,
  Megaphone,
  QrCode,
  ScrollText,
  Inbox,
} from 'lucide-react'

const managementNavGroups = [
  {
    title: 'Dashboard',
    links: [
      {
        to: '/admin',
        label: 'Dashboard',
        icon: LayoutDashboard,
      },
      {
        to: '/admin/exports',
        label: 'Exports',
        icon: Download,
      },
    ],
  },
  {
    title: 'Static Website',
    links: [
      {
        to: '/admin/static/sponsors',
        label: 'Sponsors',
        icon: Building2,
      },
      {
        to: '/admin/static/carousels',
        label: 'Carousel',
        icon: FileImage,
      },
      {
        to: '/admin/static/rewards',
        label: 'Rewards',
        icon: Gift,
      },
      {
        to: '/admin/static/about',
        label: 'About',
        icon: FileText,
      },
      {
        to: '/admin/static/schedule',
        label: 'Schedule',
        icon: ClipboardCheck,
      },
      {
        to: '/admin/static/venues',
        label: 'Venues',
        icon: MapPin,
      },
      {
        to: '/admin/static/contacts',
        label: 'Contacts',
        icon: Contact,
      },
    ],
  },
  {
    title: 'Team Review',
    links: [
      {
        to: '/admin/selection',
        label: 'Selection Result',
        icon: ClipboardCheck,
      },
      {
        to: '/admin/announcements',
        label: 'ประกาศผล',
        icon: Megaphone,
      },
      {
        to: '/admin/submission-tasks',
        label: 'Submission Tasks',
        icon: FileText,
      },
      {
        to: '/admin/submissions',
        label: 'งานที่ทีมส่ง',
        icon: Inbox,
      },
    ],
  },
  {
    title: 'สิทธิประโยชน์',
    links: [
      {
        to: '/admin/privileges',
        label: 'จัดการสิทธิ์/ของรางวัล',
        icon: Gift,
        end: true,
      },
      {
        to: '/admin/privileges/redeem',
        label: 'รับสิทธิ์ & สแกน',
        icon: QrCode,
      },
    ],
  },
  {
    title: 'System',
    links: [
      {
        to: '/admin/notifications',
        label: 'Notifications',
        icon: Mail,
      },
      {
        to: '/admin/notification-logs',
        label: 'Notification Logs',
        icon: ScrollText,
      },
    ],
  },
]

export default managementNavGroups
