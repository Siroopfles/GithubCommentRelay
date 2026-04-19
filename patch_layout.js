const fs = require('fs');
let code = fs.readFileSync('src/app/layout.tsx', 'utf8');

code = code.replace(
  'export default function RootLayout({',
  'import RateLimitBanner from \'./RateLimitBanner\';\n\nexport default function RootLayout({'
);

code = code.replace(
  '<div className="min-h-screen flex">',
  '<div className="min-h-screen flex flex-col">\n          <RateLimitBanner />\n          <div className="flex-1 flex overflow-hidden">'
);

code = code.replace(
  '</body>',
  '  </div>\n      </body>'
);

fs.writeFileSync('src/app/layout.tsx', code);
console.log('Layout Patched');
