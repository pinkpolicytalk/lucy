import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="py-10 px-6">
      <div className="max-w-4xl mx-auto flex flex-col items-center">
        <p className="text-xs tracking-[0.3em] uppercase mb-2" style={{ color: '#9d7b56', fontFamily: 'Georgia, serif' }}>
          Lucy — Agent Assistant
        </p>
        <h1
          className="text-4xl md:text-5xl text-center tracking-[0.15em] mb-3"
          style={{ color: '#2b0307', fontFamily: 'Georgia, serif', fontWeight: 600 }}
        >
          Break it down for me
        </h1>
        <div className="w-16 h-[2px] mt-2" style={{ backgroundColor: '#613834', opacity: 0.4 }}></div>
      </div>
    </header>
  );
};

export default Header;
