import { Outlet } from 'react-router-dom';
import Header from './Header.jsx';
import Footer from './Footer.jsx';

export default function Layout() {
  return (
    <>
      <Header />
      <div className="layout-shell">
        <main className="container">
          <Outlet />
        </main>
        <Footer />
      </div>
    </>
  );
}
