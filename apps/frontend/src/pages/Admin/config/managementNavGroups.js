import {
  Building2,
  ClipboardCheck,
  Contact,
  FileImage,
  FileText,
  Gift,
  LayoutDashboard,
  Mail,
  MapPin,
  QrCode,
} from 'lucide-react'

const managementNavGroups = [
  {
    title: 'Dashboard',
    links: [
      {
        to: '/admin',
        label: 'ภาพรวม',
        icon: LayoutDashboard,
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
        to: '/admin/submission-tasks',
        label: 'Submission Tasks',
        icon: FileText,
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
        to: '/admin/privileges',
        label: 'Privileges',
        icon: QrCode,
      },
    ],
  },
]

export default managementNavGroups
