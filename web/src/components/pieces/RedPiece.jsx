import Red1 from '../../assets/pieces/red-1.png'
import Red2 from '../../assets/pieces/red-2.png'
import Red3 from '../../assets/pieces/red-3.png'
import { pickVariantIndex } from '../../models/PieceVariantSelector'

const RED_VARIANTS = [Red1, Red2, Red3]

export default function RedPiece({ piece }) {
  const index = pickVariantIndex(piece, RED_VARIANTS.length)
  const textureSrc = RED_VARIANTS[index]

  return (
    <>
      <img
        src={textureSrc}
        alt='Red checker piece'
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