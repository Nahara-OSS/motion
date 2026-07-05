import { Observable } from "rxjs";

export function devicePixelRatioAsObservable(): Observable<number> {
    return new Observable((subscriber) => {
        let query = matchMedia(`(resolution: ${devicePixelRatio}dppx)`);
        query.addEventListener("change", onChange);
        subscriber.next(devicePixelRatio);

        function onChange() {
            query.removeEventListener("change", onChange);
            query = matchMedia(`(resolution: ${devicePixelRatio}dppx)`);
            query.addEventListener("change", onChange);
            subscriber.next(devicePixelRatio);
        }

        subscriber.add(() => {
            query.removeEventListener("change", onChange);
        });
    });
}
