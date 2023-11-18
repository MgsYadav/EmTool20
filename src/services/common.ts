export function getMessageFromArray(messages: any[]) {
    var message = '';
    if (messages && messages.length) {
        messages.map((element: any, index: number) => {
            if (index == 0) {
                message = element.errString;
            }
            else {
                message+=("<br/>"+element.errString);
            }
        })
    }
    return message;
}