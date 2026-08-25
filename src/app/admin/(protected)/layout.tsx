import { AdminGuard } from '@/components/AdminGuard'; import { AdminNav } from '@/components/AdminNav';
export default function AdminLayout({children}:{children:React.ReactNode}){return <div className="adminBody"><AdminGuard><div className="adminLayout"><AdminNav/><main className="adminMain">{children}</main></div></AdminGuard></div>}
