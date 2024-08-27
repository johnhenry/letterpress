export default async function (_, { params }) {
  return new Response(
    `User details for IDs: ${decodeURIComponent(params.id)}`,
    {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    }
  );
}
