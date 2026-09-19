
/* Final interaction patch:
   Under Issue > OPEN should reveal the stack in the normal page/view.
   The separate "MOISTURE UPDATE" control is the only control that should open
   the Bags + Moisture entry popup. Existing app handlers remain untouched. */
(function(){
  document.addEventListener('click', function(e){
    const el = e.target.closest && e.target.closest('button,[role="button"],a');
    if(!el) return;
    const txt = (el.textContent || '').trim().toUpperCase();
    if (txt === 'MOISTURE UPDATE' || txt === 'UPDATE MOISTURE') {
      el.setAttribute('data-moisture-update','1');
    }
  }, true);
})();
