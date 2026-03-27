interface MapEmbedProps {
  address: string;
}

export default function MapEmbed({ address }: MapEmbedProps) {
  if (!address) return null;
  const encoded = encodeURIComponent(address);

  return (
    <div className="rounded-xl overflow-hidden shadow-md border border-cream">
      <iframe
        title="Church Location"
        src={`https://www.google.com/maps?q=${encoded}&output=embed`}
        width="100%"
        height="350"
        style={{ border: 0 }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}
