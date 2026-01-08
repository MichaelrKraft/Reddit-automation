"use client"

import { cn } from "@/lib/utils"
import Link, { LinkProps } from "next/link"
import React, { useState, createContext, useContext } from "react"
import { IconMenu2, IconX } from "@tabler/icons-react"

interface Links {
  label: string
  href: string
  icon: React.JSX.Element | React.ReactNode
}

interface SidebarContextProps {
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
  animate: boolean
}

const SidebarContext = createContext<SidebarContextProps | undefined>(undefined)

export const useSidebar = () => {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider")
  }
  return context
}

export const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
}: {
  children: React.ReactNode
  open?: boolean
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>
  animate?: boolean
}) => {
  const [openState, setOpenState] = useState(false)

  const open = openProp !== undefined ? openProp : openState
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate }}>
      {children}
    </SidebarContext.Provider>
  )
}

export const Sidebar = ({
  children,
  open,
  setOpen,
  animate,
}: {
  children: React.ReactNode
  open?: boolean
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>
  animate?: boolean
}) => {
  return (
    <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
      {children}
    </SidebarProvider>
  )
}

export const SidebarBody = (props: React.ComponentProps<"div">) => {
  return (
    <>
      <DesktopSidebar {...props} />
      <MobileSidebar {...props} />
    </>
  )
}

export const DesktopSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) => {
  const { open, setOpen } = useSidebar()
  return (
    <div
      className={cn(
        "h-full px-4 py-4 hidden md:flex md:flex-col bg-[#12121a]/80 backdrop-blur-sm border-r border-gray-800 flex-shrink-0 transition-all duration-300 ease-in-out",
        open ? "w-[200px]" : "w-[70px]",
        className
      )}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      {...props}
    >
      {children}
    </div>
  )
}

export const MobileSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) => {
  const { open, setOpen } = useSidebar()
  return (
    <>
      <div
        className={cn(
          "h-14 px-4 py-4 flex flex-row md:hidden items-center justify-between bg-[#12121a]/80 backdrop-blur-sm w-full border-b border-gray-800"
        )}
        {...props}
      >
        <div className="flex justify-end z-20 w-full">
          <IconMenu2
            className="text-gray-400 cursor-pointer"
            onClick={() => setOpen(!open)}
          />
        </div>
        {open && (
          <div
            className={cn(
              "fixed h-full w-full inset-0 bg-[#0a0a0f] p-10 z-[100] flex flex-col justify-between transition-transform duration-300",
              className
            )}
          >
            <div
              className="absolute right-10 top-10 z-50 text-gray-400 cursor-pointer"
              onClick={() => setOpen(!open)}
            >
              <IconX />
            </div>
            {children}
          </div>
        )}
      </div>
    </>
  )
}

export const SidebarLink = ({
  link,
  className,
  isActive = false,
  ...props
}: {
  link: Links
  className?: string
  isActive?: boolean
  props?: LinkProps
}) => {
  const { open } = useSidebar()
  return (
    <Link
      href={link.href}
      className={cn(
        "flex items-center justify-start gap-3 group/sidebar py-2.5 px-3 rounded-lg transition-all duration-200",
        // Blue box styling for all nav items
        "bg-[#00D9FF]/10 border border-[#00D9FF]/30",
        isActive
          ? "text-[#00D9FF] bg-[#00D9FF]/20 border-[#00D9FF]/50 shadow-lg shadow-[#00D9FF]/10"
          : "text-[#00D9FF]/80 hover:text-[#00D9FF] hover:bg-[#00D9FF]/15 hover:border-[#00D9FF]/40",
        className
      )}
      {...props}
    >
      <div className="flex-shrink-0">{link.icon}</div>
      <span
        className={cn(
          "text-sm whitespace-nowrap overflow-hidden transition-all duration-300",
          open ? "opacity-100 w-auto" : "opacity-0 w-0"
        )}
      >
        {link.label}
      </span>
    </Link>
  )
}
