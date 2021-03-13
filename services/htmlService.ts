import Beatmap from '../classes/database/beatmap';
import { OSU_URL } from './buildService';

function createTitleFromBeatmap(beatmap: Beatmap) {
  return `${beatmap.artist} - ${beatmap.title} [${beatmap.version}]`;
}

export function generateHtmlForSnipes(maps: Beatmap[]): string {
  const htmlString = [
    '<table>'
      + '<tr>'
        + '<th>Sniper</th>'
        + '<th>Score</th>'
        + '<th>Map</th>'
        + '<th>Stars</th>'
      + '</tr>'
  ];

  maps.forEach((map) => {
    if (!map || !map.firstPlace) return;

    htmlString.push(
      '<tr>'
        + `<td>${map.firstPlace.playerName}</td>`
        + `<td>${map.firstPlace.score.toLocaleString()}</td>`
        + '<td>'
          // eslint-disable-next-line no-underscore-dangle
          + `<a href="${OSU_URL}/b/${map._id}">${createTitleFromBeatmap(map)}</a>`
        + '</td>'
        + `<td>${map.difficulty}</td>`
      + '</tr>'
    );
  });

  htmlString.push('</table>');
  return htmlString.join('');
}

export function generateHtmlForMaps(maps: Beatmap[]): string {
  const htmlString = [
    '<table>'
      + '<tr>'
        + '<th>Score</th>'
        + '<th>Map</th>'
        + '<th>Stars</th>'
      + '</tr>'
  ];

  maps.forEach((map) => {
    if (!map) return;

    htmlString.push('<tr>');
    htmlString.push(`<td>${map.firstPlace?.score.toLocaleString() || 'N/A'}</td>`);
    htmlString.push(
      '<td>'
      // eslint-disable-next-line no-underscore-dangle
      + `<a href="${OSU_URL}/b/${map._id}">${createTitleFromBeatmap(map)}</a>`
    + '</td>'
    + `<td>${map.difficulty}</td>`
    + '</tr>'
    );
  });

  htmlString.push('</table>');
  return htmlString.join('');
}
