import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Menu } from "lucide-react";
import { DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuLabel, 
    DropdownMenuSeparator, 
    DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function DropdownNav() {
    return(
        <DropdownMenu>

          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="p-0 flex items-center justify-center rounded-md">
                <Menu size={32} className="!w-8 !h-8 text-slate-700 dark:text-white" />
            </Button>
          </DropdownMenuTrigger>

        <DropdownMenuContent className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-2">
          <DropdownMenuItem asChild>
         {/* Button to Home */}
      <Link href="/">
        <button className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-800 text-white font-semibold transition-colors">
          🏠 Home
        </button>
      </Link>
          </DropdownMenuItem>
          
          <DropdownMenuItem asChild>
         {/* Button to Battle Groups */}
      <Link href="/battle-groups">
        <button className="px-4 py-2 rounded-lg bg-slate-500 hover:bg-slate-700 text-white font-semibold transition-colors">
          View Battle Groups
        </button>
      </Link>
          </DropdownMenuItem>
          
          <DropdownMenuItem asChild>
             {/* Button to Kill Streaks */}
      <Link href="/kill-streaks" className="ml-2">
        <button className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-800 text-white font-semibold transition-colors">
          Kill Streaks
        </button>
      </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
             {/* Button to Spreadsheet */}
      <Link href="/spreadsheet" className="ml-2">
        <button className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-800 text-white font-semibold transition-colors">
          K/D Entry Page
        </button>
      </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
             {/* Button to Manage Players */}
      <Link href="/manage-players" className="ml-2">
        <button className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-800 text-white font-semibold transition-colors">
          Manage Players
        </button>
      </Link>
          </DropdownMenuItem>
          
          <DropdownMenuItem asChild>
          <Link href="/war-assignment" className="ml-2">
        <button className="px-4 py-2 rounded-lg bg-yellow-600 hover:bg-yellow-800 text-white font-semibold transition-colors">
          War Assignment
        </button>
      </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
          <Link href="/season-management" className="ml-2">
        <button className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-800 text-white font-semibold transition-colors">
          Season Management
        </button>
      </Link>
          </DropdownMenuItem>

        </DropdownMenuContent>
      </DropdownMenu>
    )
}