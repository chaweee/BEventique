const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({ 
    host: 'localhost', 
    user: 'root', 
    password: '', 
    database: 'eventiquedb' 
  });
  
  const [rows] = await conn.query(
    'SELECT Package_ID, Package_Name, ' +
    'package_layout IS NOT NULL as has_package_layout, ' +
    'canvas_layout IS NOT NULL as has_canvas_layout, ' +
    'LENGTH(package_layout) as package_layout_length, ' +
    'LENGTH(canvas_layout) as canvas_layout_length ' +
    'FROM package WHERE Package_Name LIKE ?', 
    ['%Enchanted%']
  );
  
  console.log(JSON.stringify(rows, null, 2));
  await conn.end();
})();
