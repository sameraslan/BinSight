export default async function uploadImage(
  file: File, 
  setResponse: React.Dispatch<{status: string, data: any}>,
  setPage: React.Dispatch<React.SetStateAction<string>>
) {

  const formData = new FormData();

  formData.append('file', file);

  try {

    const response = await fetch('http://127.0.0.1:1117/predict', {
      method: 'POST',
      body: formData
    });
        
    const data = await response.json();

    if (data) {
      setResponse({
        status: 'success',
        data: {
          label: data.label, 
          score: data.score
        }
      });
      setPage('display');

    } else {
      setResponse({
        status: 'success',
        data: 'No data'  
      });
      setPage('error'); 
    }

  } catch (error) {
    console.error('Error:', error);
    setResponse({status: 'error', data: 'Failed'});
    setPage('error'); 
  }

}