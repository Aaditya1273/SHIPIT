import { Providers } from '../wagmiConfig';
import './globals.css';

export const metadata = {
  title: 'Beyond the Fog',
  description: 'Uncover the truth in the mist.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}