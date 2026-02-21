export default function PieceLayer({ pieces, geometry, textureCatalog }) {
  return (
    <div className='absolute inset-0 z-10'>
      {pieces.map((piece) => {
        const position = geometry.positionFor(piece.square)
        if (!position) return null

        const texture = textureCatalog.variantFor(piece)

        return (
          <div
            key={piece.id}
            className='absolute grid place-items-center'
            style={{
              left: `${position.left}%`,
              top: `${position.top}%`,
              width: `${position.size}%`,
              height: `${position.size}%`
            }}
          >
            <img
              src={texture.src}
              alt={`${piece.color} checker`}
              className={`h-[80%] w-[80%] object-contain drop-shadow-md ${texture.className}`}
              draggable={false}
            />

            {piece.king ? (
              <span className='absolute text-base font-black text-amber-100 drop-shadow'>
                K
              </span>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
