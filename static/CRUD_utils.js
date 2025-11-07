let root_url_ = window.location.href.split("/");
const root_url = root_url_[0]+"//"+root_url_[2]+"/";

function SuccessAlert(text){
    AlertBox(text,bgcolor="#28a745")
}

function FailAlert(text){
    AlertBox(text,bgcolor="red")
}

function AlertBox(text,bgcolor) {
    // Create the alert box
    let alertBox = document.createElement("div");
    alertBox.style.position = "fixed";
    alertBox.style.bottom = "20px";
    alertBox.style.left = "50%";
    alertBox.style.transform = "translateX(-50%)";
    alertBox.style.backgroundColor = bgcolor;
    alertBox.style.color = "white";
    alertBox.style.padding = "10px 20px";
    alertBox.style.borderRadius = "5px";
    alertBox.style.display = "flex";
    alertBox.style.justifyContent = "space-between";
    alertBox.style.alignItems = "center";
    alertBox.style.zIndex = "5";
    alertBox.style.minWidth = "300px";

    // Add the text
    let alertText = document.createElement("span");
    alertText.style.flex = "1";
    alertText.style.paddingLeft = "10px";
    alertText.innerText = text;
    alertBox.appendChild(alertText);

    // Add the close button
    let closeButton = document.createElement("span");
    closeButton.innerHTML = "&times;";
    closeButton.style.cursor = "pointer";
    closeButton.onclick = function() {
        alertBox.remove();
    };
    alertBox.appendChild(closeButton);

    // Append the alert box to the body
    document.body.appendChild(alertBox);

    // Automatically remove the alert box after 5 seconds
    setTimeout(() => {
        if (document.body.contains(alertBox)) {
            alertBox.remove();
        }
    }, 5000);
}


function RequestGet(url, callback) {
  fetch(url)
    .then(response => response.json())
    .then(data => callback(data))
    .catch(error => console.error('Error:', error));
}

function RequestPost(url, data, callback) {
    fetch(
        url,
        {
           method:'POST',
           headers:{
                'Content-Type':'application/json',
                'X-CSRFToken': get_CSRF()
            },
           body:JSON.stringify(data)
        }
    ).then(response => response.json())  // Parse the JSON response
    .then(data => {
        if(data["success"] == 1){
            SuccessAlert(data["message"]);
            callback(data);
        }else{
            FailAlert(data["message"]);
        }
    });
}

function RequestPut(url, data, callback) {
    fetch(
        url,
        {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': get_CSRF()
            },
            body: JSON.stringify(data)
        }
    )
    .then(response => response.json())  // Parse the JSON response
    .then(data => {
        if (data["success"] == 1) {
            SuccessAlert(data["message"]);
            callback(data);
        } else {
            FailAlert(data["message"]);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        FailAlert('Request failed: ' + error.message);
    });
}


function get_CSRF(){
    return get_cookie('csrftoken');
}

function get_cookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
        
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

function RequestDelete(url, onSuccess,onFail) {
    fetch(
        url,
        {
           method:'DELETE',
           headers:{
                'Content-Type':'application/json',
                'X-CSRFToken': get_CSRF()
            },
        }
    ).then(response => response.json())  // Parse the JSON response
    .then(data => {
        if(data["success"] == 1){
            SuccessAlert(data["message"]);
            onSuccess(data["message"]);
        }else{
            FailAlert(data["message"]);
            onFail(data["message"]);
        }
    });
}
