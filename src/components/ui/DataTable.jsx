import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import EmptyState from './EmptyState'
import LoadingSkeleton from './LoadingSkeleton'
export default function DataTable({
  columns,
  data,
  rowKey,
  isLoading,
  emptyTitle = 'Nothing to display yet',
  emptyDescription = 'This dataset will appear here once the module wiring is complete.',
  onRowClick,
}) {
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
