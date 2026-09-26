const model=document.getElementById('ar-model'),status=document.getElementById('ar-status');
await customElements.whenDefined('model-viewer');
model.addEventListener('load',()=>{status.textContent=model.canActivateAR?'โมเดลพร้อมแล้ว กด “วางบนพื้นที่จริง” เพื่อเริ่ม AR':!window.isSecureContext?'แสดงตัวอย่าง 3D ได้ · การวาง AR ต้องเปิดผ่าน HTTPS บนมือถือ':'โมเดลพร้อมแล้ว · อุปกรณ์หรือเบราว์เซอร์นี้ยังไม่รองรับการวาง AR';});
model.addEventListener('error',()=>{status.textContent='โหลดโมเดลไม่สำเร็จ กรุณากลับไปหน้า 3D แล้วลองใหม่';});
model.addEventListener('ar-status',event=>{if(event.detail.status==='failed')status.textContent='เริ่ม AR ไม่สำเร็จ ตรวจสอบสิทธิ์กล้องและการรองรับ AR ของอุปกรณ์';});
