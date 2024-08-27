const echoRoute = async (request) => {
  const { method, url, headers } = request;
  const body = await request.text();
  console.log(`${method} ${url}`);
  console.log([...headers]);
  console.log(body);
  return new Response(body, {
    status: 200,
    headers: {
      "content-type": headers.get("content-type") || "text/plain",
    },
  });
};
export default echoRoute;
