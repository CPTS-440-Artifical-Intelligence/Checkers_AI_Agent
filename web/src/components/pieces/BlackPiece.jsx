import Black1 from '../../assets/pieces/black-1.png'
import Black2 from '../../assets/pieces/black-2.png'
import Black3 from '../../assets/pieces/black-3.png'
import { pickVariantIndex } from '../../models/PieceVariantSelector'

const BLACK_VARIANTS = [Black1, Black2, Black3]

export default function BlackPiece({ piece }) {
  const index = pickVariantIndex(piece, BLACK_VARIANTS.length)
  const textureSrc = BLACK_VARIANTS[index]

  return (
    <>
      <img
        src={textureSrc}
        alt='Black checker piece'
        className='pointer-events-none h-[84%] w-[84%] select-none object-contain drop-shadow-md'
        draggable={false}
      />

      {piece.king ? (
        <span className='absolute text-base font-black text-amber-100 drop-shadow'>
          K
        </span>
      ) : null}
    </>
  )
}