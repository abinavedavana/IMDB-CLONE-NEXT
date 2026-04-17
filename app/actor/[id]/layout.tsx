export default function ActorLayout({
  children,
  awards,
  social,
}: {
  children: React.ReactNode
  awards: React.ReactNode
  social: React.ReactNode
}) {
  return (
    <div className="space-y-12">
      {children}

      {/* <div className="space-y-12 grid grid-cols-2 gap-10">
        {awards}
        {social}
      </div> */}
    </div>
  )
}