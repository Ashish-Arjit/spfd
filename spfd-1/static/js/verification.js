document.addEventListener("DOMContentLoaded", function () {

    ```
const form = document.getElementById("verificationForm");
const rollInput = document.getElementById("roll");
const fileInput = document.getElementById("id_card");

const rollPattern = /^S\d{2}CSEU\d{4}$/;

form.addEventListener("submit", function (event) {

    const roll = rollInput.value.trim();
    const file = fileInput.files[0];

    if (!rollPattern.test(roll)) {
        alert("Invalid Roll Number Format. Expected: SXXCSEUXXXX");
        event.preventDefault();
        return;
    }

    if (!file) {
        alert("Please upload your ID card.");
        event.preventDefault();
        return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];

    if (!allowedTypes.includes(file.type)) {
        alert("Only JPG and PNG images are allowed.");
        event.preventDefault();
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        alert("File size must be less than 5MB.");
        event.preventDefault();
        return;
    }

});
```

});
