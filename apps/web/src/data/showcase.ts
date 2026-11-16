// Proof of work: the apps that are live on the stores. Each app can show real
// in-app screens (`ui`, captured from the running app with test data) and its
// Play Store listing graphics (`shots`). Images live in public/work/<project>/<app>/.
// Keyed by the featured project's id (see data/projects.ts).

export interface ShowcaseShot {
  file: string
  caption: string
}

export interface ShowcaseApp {
  id: string
  name: string
  audience: string
  /** Folder under public/work/. */
  dir: string
  /** 'web' screens are landscape and drawn in a browser frame. Default 'phone'. */
  kind?: 'phone' | 'web'
  /** Icon file inside `dir`. Default icon.webp. */
  icon?: string
  /** Public install count shown on Google Play (mobile apps only). */
  installs?: string
  /** Short status line shown instead of installs (e.g. for a website). */
  meta?: string
  playUrl?: string
  appStoreUrl?: string
  /** Other links shown as buttons (e.g. source code). */
  links?: { label: string; sub: string; href: string }[]
  /** Store-listing graphics (marketing images from Google Play). */
  shots: ShowcaseShot[]
  /** Real in-app screens, captured from the running app. Files live in <dir>/ui/. */
  ui?: ShowcaseShot[]
}

export interface Showcase {
  projectId: string
  eyebrow: string
  headline: string
  summary: string
  accent: string
  /** Optional wide hero image (landscape), shown above the gallery. */
  wide?: { file: string; caption: string }
  stats: { value: string; label: string }[]
  apps: ShowcaseApp[]
}

const BASE = import.meta.env.BASE_URL

/** Absolute-or-relative URL of a showcase image. */
export const workUrl = (dir: string, file: string) => `${BASE}work/${dir}/${file}`

export const showcases: Showcase[] = [
  {
    projectId: 'nexaride',
    eyebrow: 'In production · Google Play & App Store',
    headline: 'Two apps. One real-time platform.',
    summary:
      'A passenger app and a driver app on a shared NestJS backend: rides, parcels, live tracking, upfront fares, wallet payouts and a loyalty pass — published and updated on the stores. Real screens below were captured from the running apps with test data.',
    accent: '#00E5FF',
    stats: [
      { value: '2', label: 'Store apps' },
      { value: '368', label: 'REST endpoints' },
      { value: '77', label: 'Data models' },
      { value: '320+', label: 'My commits' },
    ],
    apps: [
      {
        id: 'nexaride-rider',
        name: 'Nxa Ride',
        audience: 'Passenger app',
        dir: 'nexaride/rider',
        installs: '100+',
        playUrl: 'https://play.google.com/store/apps/details?id=com.nexaride.userapp',
        appStoreUrl: 'https://apps.apple.com/app/id6791447323',
        ui: [
          { file: 'home.webp', caption: 'Home — rides and parcels from one map' },
          { file: 'booking.webp', caption: 'Book for yourself, someone else or later' },
          { file: 'drop-pin.webp', caption: 'Pick the drop point on the map' },
          { file: 'choose-ride.webp', caption: 'Bike, scooty, auto, cab and SUV with upfront fares' },
          { file: 'finding.webp', caption: 'Matching with the nearest driver, live route' },
          { file: 'driver-arriving.webp', caption: 'Driver assigned — start OTP, vehicle and contact' },
          { file: 'rating.webp', caption: 'Rate the trip with quick feedback chips' },
          { file: 'my-rides.webp', caption: 'Ride history and spend summary' },
          { file: 'ride-details.webp', caption: 'Ride details — route, driver and fare breakdown' },
          { file: 'nxa-pass.webp', caption: 'NXA Pass — XP, tiers and streaks' },
          { file: 'wallet.webp', caption: 'Wallet, offers and referrals' },
          { file: 'account.webp', caption: 'Account and saved places' },
          { file: 'login.webp', caption: 'Phone number sign-in' },
        ],
        shots: [
          { file: 'home.webp', caption: 'Home — rides and parcels in one app' },
          { file: 'choose-ride.webp', caption: 'Bike, auto and cab options with upfront fares' },
          { file: 'live-trip.webp', caption: 'Live trip tracking with a start OTP' },
          { file: 'booking.webp', caption: 'Pickup, drop and scheduled rides' },
          { file: 'history.webp', caption: 'Ride and parcel history' },
          { file: 'nxa-pass.webp', caption: 'NXA Pass — XP, streaks and rider tiers' },
          { file: 'support.webp', caption: 'Help centre and issue reporting' },
        ],
      },
      {
        id: 'nexaride-driver',
        name: 'Nxa Ride Partner',
        audience: 'Driver app',
        dir: 'nexaride/driver',
        installs: '100+',
        playUrl: 'https://play.google.com/store/apps/details?id=com.nexadriver',
        ui: [
          { file: 'home.webp', caption: 'Online — slide to go offline, today’s earnings and pass time' },
          { file: 'trips.webp', caption: 'Trips — live, completed and cancelled' },
          { file: 'earnings.webp', caption: 'Earnings calendar and daily totals' },
          { file: 'wallet.webp', caption: 'Wallet and direct UPI payments' },
          { file: 'account.webp', caption: 'Partner profile, vehicle and pass' },
          { file: 'rate-rider.webp', caption: 'Rate the passenger after the trip' },
          { file: 'keep-online.webp', caption: 'Guided battery settings so offers keep arriving' },
          { file: 'login.webp', caption: 'Partner sign-in' },
          { file: 'otp.webp', caption: 'OTP verification' },
        ],
        shots: [
          { file: 'go-online.webp', caption: 'Go online and buy a day pass' },
          { file: 'trips.webp', caption: 'Trip history and earnings' },
          { file: 'wallet.webp', caption: 'Wallet and direct UPI payouts' },
          { file: 'profile.webp', caption: 'Partner profile, vehicle and documents' },
          { file: 'passes.webp', caption: 'Ride and parcel pass history' },
          { file: 'support.webp', caption: 'Partner support' },
        ],
      },
    ],
  },
  {
    projectId: 'dendo',
    eyebrow: 'In production · Google Play',
    headline: 'Three apps for a three-sided marketplace.',
    summary:
      'Customers order food and send parcels, riders deliver them, restaurants run their kitchen — three Flutter apps on one Laravel backend, live on Google Play. Real screens below were captured from the running apps with test data.',
    accent: '#3B6CF6',
    stats: [
      { value: '3', label: 'Live apps' },
      { value: '2.5K+', label: 'Play installs' },
      { value: 'Food + Parcel', label: 'Two businesses' },
      { value: 'Flutter · Laravel', label: 'Stack' },
    ],
    apps: [
      {
        id: 'dendo-customer',
        name: 'Dendo',
        audience: 'Customer app',
        dir: 'dendo/customer',
        installs: '1K+',
        playUrl: 'https://play.google.com/store/apps/details?id=com.dendo.update.user',
        ui: [
          { file: 'home.webp', caption: 'Home — offers, categories and first-order deals' },
          { file: 'restaurants.webp', caption: 'Nearby restaurants with ETA and starting price' },
          { file: 'restaurant.webp', caption: 'Restaurant page — rating, ETA and distance' },
          { file: 'menu.webp', caption: 'Menu — popular dishes and under-₹99 picks' },
          { file: 'collections.webp', caption: 'Curated dish collections' },
          { file: 'bill.webp', caption: 'Cart with a transparent bill and coupon savings' },
          { file: 'parcel-pickup.webp', caption: 'Parcel booking — pick-up point on the map' },
          { file: 'parcel-drop.webp', caption: 'Parcel booking — choose the drop location' },
          { file: 'orders.webp', caption: 'Order history with in-line ratings' },
          { file: 'order-details.webp', caption: 'Order details with the delivered route' },
          { file: 'profile.webp', caption: 'Profile — loyalty tier, streaks and wallet' },
          { file: 'otp.webp', caption: 'Phone number + OTP sign-in' },
        ],
        shots: [
          { file: 'overview.webp', caption: 'Food, snacks and parcels' },
          { file: 'home.webp', caption: 'Home — deals, categories and restaurants' },
          { file: 'ordering.webp', caption: 'Choose, add to cart, confirm' },
          { file: 'tracking.webp', caption: 'Live order tracking on the map' },
          { file: 'parcel.webp', caption: 'Parcel delivery' },
          { file: 'offers.webp', caption: 'Offers and free-delivery deals' },
        ],
      },
      {
        id: 'dendo-rider',
        name: 'Dendo Delivery Partner',
        audience: 'Rider app',
        dir: 'dendo/rider',
        installs: '1K+',
        playUrl: 'https://play.google.com/store/apps/details?id=com.dendo.update.delivery',
        ui: [
          { file: 'home.webp', caption: 'Rider home — live map, go-online switch, promotions' },
          { file: 'home-earnings.webp', caption: 'Today’s earnings, weekly totals and performance' },
          { file: 'busy-spots.webp', caption: 'BusySpots — where orders are right now' },
          { file: 'bonus.webp', caption: 'In-app incentive offers' },
          { file: 'earnings.webp', caption: 'Wallet, cash in hand and withdrawals' },
          { file: 'earnings-tour.webp', caption: 'Guided first-run tour of each screen' },
          { file: 'profile.webp', caption: 'Profile — orders, performance, zones, referrals' },
          { file: 'sign-in.webp', caption: 'Phone + OTP sign-in' },
        ],
        shots: [
          { file: 'earnings.webp', caption: 'Turn time into earnings' },
          { file: 'registration.webp', caption: 'Free registration' },
          { file: 'kit.webp', caption: 'Free delivery bag and uniform' },
        ],
      },
      {
        id: 'dendo-restaurant',
        name: 'Dendo Restaurant Partner',
        audience: 'Restaurant app',
        dir: 'dendo/restaurant',
        installs: '500+',
        playUrl: 'https://play.google.com/store/apps/details?id=com.dendo.update.store',
        ui: [
          { file: 'orders.webp', caption: 'Live orders board and order history' },
          { file: 'menu.webp', caption: 'Menu — stock, prices and one-tap availability' },
          { file: 'reports.webp', caption: 'Sales reports and top-rated items' },
          { file: 'wallet.webp', caption: 'Wallet, payouts and weekly settlement' },
          { file: 'kitchen.webp', caption: 'Kitchen & operations tools' },
          { file: 'more.webp', caption: 'Store, offers, reviews and settings' },
          { file: 'sign-in.webp', caption: 'Phone + OTP sign-in' },
        ],
        shots: [
          { file: 'insights.webp', caption: 'Business insights dashboard' },
          { file: 'store.webp', caption: 'Store status and sales performance' },
          { file: 'new-order.webp', caption: 'Incoming order alerts' },
          { file: 'availability.webp', caption: 'Switch items on or off instantly' },
          { file: 'menu.webp', caption: 'All-in-one menu and marketing tools' },
          { file: 'wallet.webp', caption: 'Wallet and withdrawals' },
          { file: 'order-history.webp', caption: 'Order history and filters' },
          { file: 'outlets.webp', caption: 'Multiple outlets and staff' },
        ],
      },
    ],
  },
]

showcases.push({
  projectId: 'trustlance',
  eyebrow: 'Web platform · Hackathon winner, rebuilt as v2',
  headline: 'Freelance work, funded before it starts.',
  summary:
    'A freelance marketplace where every contract is locked in escrow before work begins and each milestone is paid on approval. Real screens below were captured from the website running locally.',
  accent: '#2DE38E',
  stats: [
    { value: 'Next.js 15', label: 'App' },
    { value: 'Supabase', label: 'Postgres + RLS' },
    { value: '13', label: 'DB migrations' },
    { value: 'Winner', label: 'GDG KSR Web3' },
  ],
  apps: [
    {
      id: 'trustlance-web',
      name: 'TrustLance',
      audience: 'Website',
      kind: 'web',
      icon: 'icon.svg',
      dir: 'trustlance',
      meta: 'Next.js · Supabase · Three.js',
      links: [{ label: 'Source code', sub: 'GitHub', href: 'https://github.com/TheParthi/TRTLance' }],
      ui: [
        { file: 'hero.webp', caption: 'Landing — the 3D escrow ring shows a live example contract' },
        { file: 'statement.webp', caption: 'Scroll-inked manifesto' },
        { file: 'agree.webp', caption: 'How the money moves — 01 Agree' },
        { file: 'fund.webp', caption: '02 Fund — the client locks the total in escrow' },
        { file: 'release.webp', caption: '05 Release — approved milestone paid to the freelancer' },
        { file: 'two-ways.webp', caption: 'Two ways in: hire or work' },
        { file: 'protection.webp', caption: 'Protection — escrow, coins, disputes, AI that advises' },
        { file: 'footer.webp', caption: 'Closing wordmark' },
        { file: 'login.webp', caption: 'Sign in with Google or email' },
        { file: 'signup.webp', caption: 'Create an account' },
      ],
      shots: [],
    },
  ],
})

export const showcaseFor =(projectId: string) => showcases.find((s) => s.projectId === projectId)
