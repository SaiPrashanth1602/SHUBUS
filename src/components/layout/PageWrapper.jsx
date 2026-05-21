import NavBar from "./NavBar"

function PageWrapper({ role, children }) {
  return (
    <div className="min-h-screen bg-vitlight">
      <NavBar role={role} />
      
      {/* max-w-7xl: Keeps content from stretching too wide on ultrawide monitors
        mx-auto: Centers the content container
        p-4 md:p-8: Smaller padding on mobile, more breathing room on desktop
      */}
      <main className="max-w-7xl mx-auto p-4 md:p-8">
        {children}
      </main>
    </div>
  )
}

export default PageWrapper