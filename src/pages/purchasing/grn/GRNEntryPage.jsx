import { useParams } from 'react-router-dom'
import GoodsReceiptEntryPage from './GoodsReceiptEntryPage'

export default function GRNEntryPage() {
  const { poId } = useParams()

  return <GoodsReceiptEntryPage detailOnly entryPoId={poId} />
}
