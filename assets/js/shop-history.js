// Read every page with deterministic ordering, including accounts older than the API row limit.
window.shopHistory=async function(query){
  const rows=[];
  for(let start=0;;start+=200){
    const {data,error}=await query().range(start,start+199);
    if(error)return {error};
    rows.push(...data);
    if(data.length<200)return {data:rows};
  }
};
