const options = ["option1", "option2", "option3"];
options.forEach((option) => {
  document.getElementById(option).addEventListener("change", function () {
    console.log(`${option} changed to ${this.checked}`);
  });
});
