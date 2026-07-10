"use client"

import { useState } from "react"
import {
    ColumnDef, ColumnFiltersState,
    flexRender, getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    useReactTable,
    VisibilityState
} from "@tanstack/react-table"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
    Search,
    ChevronLeft,
    ChevronRight,
    ListFilter,
    Car,
    KeyRound,
    CircleCheck,
    Clock,
} from "lucide-react"

const statutFilters = [
    { value: "all", label: "Tous", icon: ListFilter },
    { value: "disponible", label: "Disponible", icon: CircleCheck },
    { value: "loue", label: "Loue", icon: KeyRound },
    { value: "vendu", label: "Vendu", icon: Car },
    { value: "reserve", label: "Reserve", icon: Clock },
]

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
}

export function DataTable<TData, TValue>({
    columns,
    data,
}: DataTableProps<TData, TValue>) {
    const [rowSelection, setRowSelection] = useState({})
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
    const [globalFilter, setGlobalFilter] = useState("")
    const [activeStatut, setActiveStatut] = useState("all")
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({ status_validation: false })

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onRowSelectionChange: setRowSelection,
        onColumnFiltersChange: setColumnFilters,
        onGlobalFilterChange: setGlobalFilter,
        globalFilterFn: "includesString",
        state: {
            rowSelection,
            columnFilters,
            globalFilter,
            columnVisibility, // ← ajouté
        },
        initialState: {
            pagination: { pageSize: 8 },
        },
        onColumnVisibilityChange: setColumnVisibility,
    })

    const handleStatutFilter = (value: string) => {
        setActiveStatut(value)
        if (value === "all") {
            table.getColumn("statut")?.setFilterValue(undefined)
        } else {
            table.getColumn("statut")?.setFilterValue([value])
        }
    }

    const validationFilters = [
        { value: "all", label: "Tous" },
        { value: "validee", label: "Validé" },
        { value: "en_attente", label: "En attente" },
        { value: "rejetee", label: "Rejeté" },
    ]

    const [activeValidation, setActiveValidation] = useState("all")

    const handleValidationFilter = (value: string) => {
        setActiveValidation(value)
        if (value === "all") {
            table.getColumn("status_validation")?.setFilterValue(undefined)
        } else {
            table.getColumn("status_validation")?.setFilterValue([value])
        }
    }


    return (
        <div className="space-y-4">
            {/* Search + Filters */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative max-w-sm flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Rechercher un vehicule..."
                        value={globalFilter}
                        onChange={(e) => setGlobalFilter(e.target.value)}
                        className="pl-9 h-9 rounded-lg bg-card border-border"
                    />
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto">
                    {statutFilters.map((filter) => {
                        const isActive = activeStatut === filter.value
                        return (
                            <Button
                                key={filter.value}
                                variant={isActive ? "default" : "outline"}
                                size="sm"
                                onClick={() => handleStatutFilter(filter.value)}
                                className={`cursor-pointer rounded-lg gap-1.5 text-xs shrink-0 ${isActive ? "bg-zinc-900 text-white shadow-sm hover:bg-zinc-800" : "bg-card hover:bg-secondary/70"
                                    }`}
                            >
                                <filter.icon className="h-3.5 w-3.5" />
                                {filter.label}
                            </Button>
                        )
                    })}
                </div>
            </div>

            {/* Filtres validation */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
                {validationFilters.map((filter) => {
                    const isActive = activeValidation === filter.value
                    return (
                        <Button
                            key={filter.value}
                            variant={isActive ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleValidationFilter(filter.value)}
                            className={`cursor-pointer rounded-lg gap-1.5 text-xs shrink-0 ${isActive ? "bg-zinc-900 text-white shadow-sm hover:bg-zinc-800" : "bg-card hover:bg-secondary/70"
                                }`}
                        >
                            {filter.label}
                        </Button>
                    )
                })}
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-xl border border-border bg-card">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow
                                key={headerGroup.id}
                                className="bg-secondary/80 hover:bg-secondary/80"
                            >
                                {headerGroup.headers.map((header) => (
                                    <TableHead
                                        key={header.id}
                                        className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                                    >
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(header.column.columnDef.header, header.getContext())}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                    className="transition-colors"
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id} className="py-3">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-32 text-center">
                                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                        <Car className="h-8 w-8" />
                                        <p className="text-sm font-medium">Aucun vehicule trouve</p>
                                        <p className="text-xs">Essayez de modifier vos filtres</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Footer: Selection count + Pagination */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                    {table.getFilteredSelectedRowModel().rows.length} sur{" "}
                    {table.getFilteredRowModel().rows.length} ligne(s) selectionnee(s)
                </p>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                        className="cursor-pointer rounded-lg gap-1"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Precedent
                    </Button>
                    <div className="flex h-8 min-w-8 items-center justify-center rounded-lg bg-zinc-900 px-2.5 text-xs font-medium text-white shadow-sm">
                        {table.getState().pagination.pageIndex + 1}
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                        className="cursor-pointer rounded-lg gap-1"
                    >
                        Suivant
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    )
}
