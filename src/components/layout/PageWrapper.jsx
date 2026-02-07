import NavBar from "./NavBar"

function PageWrapper({ role, children }) {
  return (
    <div className="min-h-screen bg-vitlight">
      <NavBar role={role} />
      <div className="p-6">
        {children}
      </div>
    </div>
  )
}

export default PageWrapper
