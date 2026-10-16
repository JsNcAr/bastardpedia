import { Link, NavLink, Outlet, ScrollRestoration, useLocation } from 'react-router';
import { IconSprite } from '@/ui/IconSprite';
import { ThemeToggle } from './ThemeToggle';

const NAV = [
  { to: '/', label: 'Catalogue' },
  { to: '/library', label: 'Library' },
  { to: '/about', label: 'About' },
];

/** A story page belongs to the catalogue, so Catalogue stays current there. */
function isCurrent(to: string, pathname: string) {
  if (to === '/') return pathname === '/' || pathname.startsWith('/stories/');
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function AppShell() {
  const { pathname } = useLocation();
  return (
    <>
      <IconSprite />
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <NavLink to="/" className="brand" end>
          {__APP_NAME__}
        </NavLink>
        <nav aria-label="Main" className="site-nav">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="site-nav-link"
              aria-current={isCurrent(n.to, pathname) ? 'page' : undefined}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <ThemeToggle />
      </header>
      <main id="main" className="site-main" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="site-footer">
        <span className="site-footer-label" aria-hidden="true">
          Theme
        </span>
        <ThemeToggle />
      </footer>
      <ScrollRestoration />
    </>
  );
}
