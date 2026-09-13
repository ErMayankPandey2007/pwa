// Events mock data & service for PWA

export const initialEventsData = [
  {
    id: 1,
    title: 'Mega Jan Sabha 2026',
    eventType: 'Jan Sabha',
    location: 'Sampurnanand Sanskrit University Ground, Varanasi',
    shortLocation: 'Varanasi, UP',
    date: '25 Sep 2026',
    time: '10:00 AM - 01:00 PM',
    image: 'https://images.unsplash.com/photo-1541888087405-d61db6c1e13a?auto=format&fit=crop&q=80&w=800',
    category: 'Upcoming',
    isLiveSoon: true,
    expectedAttendees: '25,000+ Citizens',
    organizer: 'BJP Varanasi Mahanagar Unit',
    chiefGuest: 'Dr. Rajesh Tripathi (MLA) & State Ministers',
    desc: 'Grand public meeting addressing constituency infrastructure, youth employment opportunities, expressway connectivity, and rural health center expansion.',
    agenda: [
      { time: '10:00 AM', item: 'Inauguration & Deep Prajjwalan' },
      { time: '10:30 AM', item: 'Felicitation of Gram Pradhans and Karyakartas' },
      { time: '11:15 AM', item: 'Keynote Address on UP Infrastructure Corridor' },
      { time: '12:30 PM', item: 'Direct Citizen Grievance Submissions & Wrap Up' }
    ],
    photos: [
      'https://images.unsplash.com/photo-1541888087405-d61db6c1e13a?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1514574972183-11b30521e483?auto=format&fit=crop&q=80&w=600'
    ]
  },
  {
    id: 2,
    title: 'Yuva Morcha Vijay Sankalp Rally',
    eventType: 'Rally',
    location: 'Scientific Convention Center to Hazratganj, Lucknow',
    shortLocation: 'Lucknow, UP',
    date: '02 Oct 2026',
    time: '12:00 PM - 04:00 PM',
    image: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&q=80&w=800',
    category: 'Upcoming',
    isLiveSoon: false,
    expectedAttendees: '10,000+ Youth',
    organizer: 'Yuva Morcha Uttar Pradesh',
    chiefGuest: 'State Yuva Morcha President',
    desc: 'Massive bike and tricolor rally rallying youth for active political participation, entrepreneurship incentives, and grassroots social initiatives.',
    agenda: [
      { time: '12:00 PM', item: 'Assembly of Youth Delegations' },
      { time: '01:00 PM', item: 'Flag-off by Hon. MLA' },
      { time: '03:30 PM', item: 'Concluding Youth Address at Hazratganj' }
    ],
    photos: [
      'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1525013066836-c6090f0ad9d8?auto=format&fit=crop&q=80&w=600'
    ]
  },
  {
    id: 3,
    title: 'District Strategic Meeting & Booth Review',
    eventType: 'Meeting',
    location: 'District Party HQ, Rohaniya, Varanasi',
    shortLocation: 'Rohaniya, Varanasi',
    date: '08 Oct 2026',
    time: '03:00 PM - 06:00 PM',
    image: 'https://images.unsplash.com/photo-1514574972183-11b30521e483?auto=format&fit=crop&q=80&w=800',
    category: 'Upcoming',
    isLiveSoon: false,
    expectedAttendees: '500+ Office Bearers',
    organizer: 'District Executive Committee',
    chiefGuest: 'Constituency In-charge & MLA',
    desc: 'Internal review meeting with Mandal Presidents, Sector Incharges, and Booth Adhyakshas to assess ongoing development monitoring and public welfare coverage.',
    agenda: [
      { time: '03:00 PM', item: 'Booth Performance Audit' },
      { time: '04:30 PM', item: 'Voter List Verification Roadmap' },
      { time: '05:30 PM', item: 'Action Plan for Upcoming Public Chaupals' }
    ],
    photos: [
      'https://images.unsplash.com/photo-1514574972183-11b30521e483?auto=format&fit=crop&q=80&w=600'
    ]
  },
  {
    id: 4,
    title: 'Mega Blood Donation & Health Camp',
    eventType: 'Blood Donation',
    location: 'Shivpur Community Health Center, Varanasi',
    shortLocation: 'Shivpur, Varanasi',
    date: '14 Oct 2026',
    time: '09:00 AM - 03:00 PM',
    image: 'https://images.unsplash.com/photo-1532375810565-c0ba94c93ebc?auto=format&fit=crop&q=80&w=800',
    category: 'Upcoming',
    isLiveSoon: false,
    expectedAttendees: '800+ Donors & Patients',
    organizer: 'Seva Samarpan Trust & Red Cross',
    chiefGuest: 'Chief Medical Officer & MLA',
    desc: 'Voluntary blood donation drive along with free health check-up, eye testing, and distribution of generic medicine kits to needy families.',
    agenda: [
      { time: '09:00 AM', item: 'Inauguration & Donor Registrations' },
      { time: '11:00 AM', item: 'Free Health & Eye Checkup Camp' },
      { time: '02:30 PM', item: 'Certificate Distribution to Volunteer Donors' }
    ],
    photos: [
      'https://images.unsplash.com/photo-1532375810565-c0ba94c93ebc?auto=format&fit=crop&q=80&w=600'
    ]
  },
  {
    id: 5,
    title: 'Sadasyata Abhiyan (Membership Mega Drive)',
    eventType: 'Membership Drive',
    location: 'Kashi Vidyapeeth Block Office Grounds, Varanasi',
    shortLocation: 'Kashi Vidyapeeth, Varanasi',
    date: '18 Oct 2026',
    time: '10:00 AM - 05:00 PM',
    image: 'https://images.unsplash.com/photo-1525013066836-c6090f0ad9d8?auto=format&fit=crop&q=80&w=800',
    category: 'Upcoming',
    isLiveSoon: false,
    expectedAttendees: '5,000+ New Members',
    organizer: 'Varanasi Cantt Membership Cell',
    chiefGuest: 'State General Secretary (Org)',
    desc: 'Constituency-wide drive to onboard citizens and young professionals into active party membership with instant digital membership cards and kits.',
    agenda: [
      { time: '10:00 AM', item: 'Digital Kiosks Setup for Instant Enrollment' },
      { time: '01:00 PM', item: 'Welcome Address to New Primary Members' },
      { time: '04:00 PM', item: 'Orientation Session on Party Ideology & Work' }
    ],
    photos: [
      'https://images.unsplash.com/photo-1525013066836-c6090f0ad9d8?auto=format&fit=crop&q=80&w=600'
    ]
  },
  {
    id: 6,
    title: 'Beti Padhao & Kanya Vivah Sahayata Chaupal',
    eventType: 'Social Program',
    location: 'Manduadih Kalyan Mandapam, Varanasi',
    shortLocation: 'Manduadih, Varanasi',
    date: '22 Oct 2026',
    time: '11:00 AM - 02:00 PM',
    image: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80&w=800',
    category: 'Upcoming',
    isLiveSoon: false,
    expectedAttendees: '1,200+ Beneficiaries',
    organizer: 'Mahila Kalyan & Social Justice Wing',
    chiefGuest: 'Dr. Rajesh Tripathi (MLA)',
    desc: 'Social welfare program facilitating government scholarship forms, bicycle distribution to meritorious girl students, and financial aid disbursement.',
    agenda: [
      { time: '11:00 AM', item: 'Scholarship Grant Checks Handover' },
      { time: '12:15 PM', item: 'Bicycle Distribution to 100+ Students' },
      { time: '01:30 PM', item: 'Open Discussion on Safety & Skill Training' }
    ],
    photos: [
      'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80&w=600'
    ]
  },
  {
    id: 7,
    title: 'Vikas Parv Rally & Infiltration Review',
    eventType: 'Rally',
    location: 'Rohaniya Mandi Parishad, Varanasi',
    shortLocation: 'Varanasi, UP',
    date: '10 Aug 2026',
    time: '10:00 AM - 01:30 PM',
    image: 'https://images.unsplash.com/photo-1541888087405-d61db6c1e13a?auto=format&fit=crop&q=80&w=800',
    category: 'Past',
    isLiveSoon: false,
    expectedAttendees: '25,000 Attendees',
    organizer: 'District Administration & MLA Office',
    chiefGuest: 'Union & State Ministers',
    desc: 'Successfully concluded mega rally with over 25,000 citizens in attendance. Foundation stone laid for 5 major road projects and 2 health centers.',
    agenda: [
      { time: '10:00 AM', item: 'Welcome of Dignitaries' },
      { time: '11:00 AM', item: 'Foundation Stone Unveiling Ceremony' },
      { time: '01:00 PM', item: 'Public Address & Thanksgiving' }
    ],
    photos: [
      'https://images.unsplash.com/photo-1541888087405-d61db6c1e13a?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80&w=600'
    ]
  },
  {
    id: 8,
    title: 'Swachh Kashi Mission - Community Drive',
    eventType: 'Social Program',
    location: 'Assi Ghat & Surrounding Heritage Streets, Varanasi',
    shortLocation: 'Assi Ghat, Varanasi',
    date: '15 Jul 2026',
    time: '07:00 AM - 11:00 AM',
    image: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&q=80&w=800',
    category: 'Past',
    isLiveSoon: false,
    expectedAttendees: '3,000+ Volunteers',
    organizer: 'Nagar Nigam & Yuva Karyakartas',
    chiefGuest: 'Mayor & Dr. Rajesh Tripathi',
    desc: 'Massive civic sanitation drive along river ghats and residential wards with active participation from students, traders, and local associations.',
    agenda: [
      { time: '07:00 AM', item: 'Swachhata Oath Ceremony' },
      { time: '07:30 AM', item: 'Shramdaan & Waste Segregation' },
      { time: '10:30 AM', item: 'Honoring Sanitation Warriors' }
    ],
    photos: [
      'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&q=80&w=600'
    ]
  }
];

const EVENTS_STORAGE_KEY = 'pwa_events_data';
const RSVP_STORAGE_KEY = 'pwa_events_rsvp';

export const eventsStorage = {
  getEvents: () => {
    try {
      const data = localStorage.getItem(EVENTS_STORAGE_KEY);
      if (!data) {
        localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(initialEventsData));
        return initialEventsData;
      }
      return JSON.parse(data);
    } catch (e) {
      return initialEventsData;
    }
  },
  getEventById: (id) => {
    const events = eventsStorage.getEvents();
    return events.find(e => e.id === parseInt(id)) || events[0];
  },
  getRsvp: () => {
    try {
      const data = localStorage.getItem(RSVP_STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      return {};
    }
  },
  setRsvp: (eventId, status) => {
    const rsvp = eventsStorage.getRsvp();
    rsvp[eventId] = status;
    localStorage.setItem(RSVP_STORAGE_KEY, JSON.stringify(rsvp));
    return rsvp;
  }
};
