import React, { createContext, useContext, useEffect, useState } from 'react';

// Simple hand‑rolled router using the HTML5 History API
const RouterContext = createContext({
  path: '/',
  navigate: (to) => {},
});

export const Router = ({ children }) => {
  const [path, setPath] = useState(window.location.pathname);

  // Listen for back/forward navigation
  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = (to) => {
    if (to !== path) {
      window.history.pushState({}, '', to);
      setPath(to);
    }
  };

  return (
    <RouterContext.Provider value={{ path, navigate }}>
      {children}
    </RouterContext.Provider>
  );
};

export const Route = ({ path: routePath, element }) => {
  const { path } = useContext(RouterContext);
  return path === routePath ? element : null;
};

export const Link = ({ to, children, className }) => {
  const { navigate } = useContext(RouterContext);
  const handleClick = (e) => {
    e.preventDefault();
    navigate(to);
  };
  return (
    <a href={to} onClick={handleClick} className={className}>
      {children}
    </a>
  );
};

export const useNavigate = () => {
  const { navigate } = useContext(RouterContext);
  return navigate;
};
