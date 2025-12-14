// NOTE: If you see "Module not found: Can't resolve 'sweetalert2'", run:
//   c:\xampp\htdocs\Eventique\install_sweetalert2.cmd
import React, { useState, useEffect } from "react";

export default function AdminContentHeader({ title }) {
  const [adminName, setAdminName] = useState("Administrator");

  useEffect(() => {
    const fetchAdminName = async () => {
      try {
        const user = JSON.parse(sessionStorage.getItem("user") || "{}");
        if (!user.id) {
          setAdminName("Administrator");
          return;
        }

        const res = await fetch(`http://localhost:3001/api/auth/admin/${user.id}`);
        const data = await res.json();

        if (data.status === "success" && data.admin) {
          const firstName = data.admin.firstname || "";
          const lastName = data.admin.lastname || "";
          const middleInitial = data.admin.M_I || "";
          
          let fullName = firstName;
          if (middleInitial) {
            fullName += ` ${middleInitial}.`;
          }
          if (lastName) {
            fullName += ` ${lastName}`;
          }
          
          setAdminName(fullName.trim() || "Administrator");
        }
      } catch (err) {
        console.error("Failed to fetch admin name:", err);
        setAdminName("Administrator");
      }
    };

    fetchAdminName();
  }, []);

  return (
    <header className="content-header">
      <h1>{title}</h1>
      <div className="user-profile">{adminName}</div>
    </header>
  );
}
