import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import PostDetail from './pages/PostDetail';
import Write from './pages/Write';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';

/** 页面进场动效：淡入上浮（MotionConfig 已处理 reduced-motion 降级） */
function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.main
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.main>
  );
}

export default function App() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-ink text-paper">
      <Navbar />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<PageTransition><Home /></PageTransition>} />
          <Route path="/post/:id" element={<PageTransition><PostDetail /></PageTransition>} />
          <Route
            path="/write"
            element={
              <ProtectedRoute>
                <PageTransition><Write /></PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <PageTransition><Profile /></PageTransition>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
          <Route path="/register" element={<PageTransition><Register /></PageTransition>} />
          <Route
            path="*"
            element={
              <PageTransition>
                <div className="mx-auto max-w-3xl px-6 py-32 text-center">
                  <p className="font-display text-8xl font-bold text-accent">404</p>
                  <p className="mt-4 text-fog">页面不存在，或已被移出这个宇宙。</p>
                </div>
              </PageTransition>
            }
          />
        </Routes>
      </AnimatePresence>
      <footer className="border-t border-carbon py-8 text-center font-mono text-xs text-smoke">
        LUMEN © 2026 — A digital magazine that glows.
      </footer>
    </div>
  );
}
