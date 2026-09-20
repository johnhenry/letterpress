// Import the necessary functions
import { createResponse, createRequest } from "../index.mjs";
// Utility function to create a simple readable stream
const createReadableStream = (data) => {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(data));
      controller.close();
    },
  });
};

// Demo 1: Simple GET request
async function demoSimpleGetRequest() {
  console.log("Demo 1: Simple GET request");
  const request = await createRequest()`
GET /api/users HTTP/1.1
Accept: application/json
`;
  console.log("Method:", request.method);
  console.log("URL:", request.url);
  console.log("Headers:", Object.fromEntries(request.headers));
  console.log("\n");
}

// Demo 2: POST request with JSON body
async function demoPostRequestWithJson() {
  console.log("Demo 2: POST request with JSON body");
  const userData = { name: "John Doe", email: "john@example.com" };
  const request = await createRequest({ baseUrl: "https://api.example.com" })`
POST /users HTTP/1.1
Content-Type: application/json

${JSON.stringify(userData)}
`;
  console.log("Method:", request.method);
  console.log("URL:", request.url);
  console.log("Headers:", Object.fromEntries(request.headers));
  console.log("Body:", await request.json());
  console.log("\n");
}

// Demo 3: PUT request with URLSearchParams
async function demoPutRequestWithUrlSearchParams() {
  console.log("Demo 3: PUT request with URLSearchParams");
  const params = new URLSearchParams({ key1: "value1", key2: "value2" });
  const request = await createRequest()`
PUT https://api.example.com/update HTTP/1.1
User-Agent: TestAgent/1.0

${params}
`;
  console.log("Method:", request.method);
  console.log("URL:", request.url);
  console.log("Headers:", Object.fromEntries(request.headers));
  console.log("Body:", await request.text());
  console.log("\n");
}

// Demo 4: POST request with FormData
async function demoPostRequestWithFormData() {
  console.log("Demo 4: POST request with FormData");
  const formData = new FormData();
  formData.append("username", "testuser");
  formData.append("password", "testpass");
  const request = await createRequest({ baseUrl: "https://auth.example.com" })`
POST /login HTTP/1.1
User-Agent: TestAgent/1.0

${formData}
`;
  console.log("Method:", request.method);
  console.log("URL:", request.url);
  console.log("Headers:", Object.fromEntries(request.headers));
  console.log("Body is FormData:", request.body instanceof FormData);
  console.log("\n");
}

// Demo 5: Basic HTML response
async function demoBasicHtmlResponse() {
  console.log("Demo 5: Basic HTML response");
  const response = await createResponse`HTTP/1.1 200 OK
Content-Type: text/html

<html><body>Hello, World!</body></html>
`;
  console.log("Status:", response.status);
  console.log("Headers:", Object.fromEntries(response.headers));
  console.log("Body:", await response.text());
  console.log("\n");
}

// Demo 6: JSON response
async function demoJsonResponse() {
  console.log("Demo 6: JSON response");
  const jsonBody = JSON.stringify({ message: "Success", code: 200 });
  const response = await createResponse`HTTP/1.1 200 OK
Content-Type: application/json

${jsonBody}
`;
  console.log("Status:", response.status);
  console.log("Headers:", Object.fromEntries(response.headers));
  console.log("Body:", await response.json());
  console.log("\n");
}

// Demo 7: Response with custom status code
async function demoCustomStatusResponse() {
  console.log("Demo 7: Response with custom status code");
  const response = await createResponse`HTTP/1.1 404 Not Found
Content-Type: text/plain

Resource not found
`;
  console.log("Status:", response.status);
  console.log("Status Text:", response.statusText);
  console.log("Headers:", Object.fromEntries(response.headers));
  console.log("Body:", await response.text());
  console.log("\n");
}

// Demo 8: Response with ReadableStream body
async function demoReadableStreamResponse() {
  console.log("Demo 8: Response with ReadableStream body");
  const streamData = "This is streaming response data";
  const stream = createReadableStream(streamData);
  const response = await createResponse`HTTP/1.1 200 OK
Content-Type: application/octet-stream

${stream}
`;
  console.log("Status:", response.status);
  console.log("Headers:", Object.fromEntries(response.headers));
  console.log("Body:", await response.text());
  console.log("\n");
}

const demoResponse = async () => {
  const response = await createResponse`HTTP/1.1 200 OK
Content-Type: text/html

<!DOCTYPE html>
<html>
  <head>
    <title>Letterpress Demo</title>
  </head>
  <body>
    <h1>Welcome to Letterpress!</h1>
    <p>The current time is: </p>
    <p>Your user agent is: </p>
  </body>
</html>`;
  console.log("Status:", response.status);
  console.log("Headers:", Object.fromEntries(response.headers));
  console.log("Body:", await response.text());
  console.log("\n");
};

// Run all demos
async function runAllDemos() {
  await demoSimpleGetRequest();
  await demoPostRequestWithJson();
  await demoPutRequestWithUrlSearchParams();
  await demoPostRequestWithFormData();
  await demoBasicHtmlResponse();
  await demoJsonResponse();
  await demoCustomStatusResponse();
  await demoReadableStreamResponse();
  await demoResponse();
}

runAllDemos().catch(console.error);
