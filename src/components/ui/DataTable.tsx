import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowData,
} from '@tanstack/react-table'

import EmptyState from './EmptyState'
import LoadingSkeleton from './LoadingSkeleton'

type DataTableProps<TData extends RowData> = {
  columns: ColumnDef<TData, unknown>[]
  data: TData[]
  rowKey?: (row: TData, index: number) => string
  isLoading?: boolean
  emptyTitle?: string
  emptyDescription?: string
  onRowClick?: (row: TData) => void
}

export default function DataTable<TData extends RowData>({
  columns,
  data,
  rowKey,
  isLoading,
  emptyTitle = 'Nothing to display yet',
  emptyDescription = 'This dataset will appear here once the module wiring is complete.',
  onRowClick,
}: DataTableProps<TData>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: rowKey ? (row, index) => rowKey(row, index) : (_row, index) => `row-${index}`,
  })

  if (isLoading) {
    return <LoadingSkeleton rows={5} cols={columns.length || 4} />
  }

  if (!data.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />
  }

  return (
    <div className="panel overflow-x-auto">
      <table className="data-table min-w-full">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} onClick={() => onRowClick?.(row.original)}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
