export default async function uploadImage(
  file: File, 
  setResponse: React.Dispatch<{status: string, data: any}>,
  setPage: React.Dispatch<React.SetStateAction<string>>
) {
  // Simulate a short delay to mimic network request
  await new Promise(resolve => setTimeout(resolve, 500));

  // Always set the classification to "trash" with 100% confidence
  setResponse({
    status: 'success',
    data: {
      label: 'trash', 
      score: 1.0
    }
  });
  setPage('display');
}
