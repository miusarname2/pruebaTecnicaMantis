export const formatProjectList = (project) => ({
  id: project.id,
  name: project.name,
  address: project.address,
  status: project.status,
  clientName: project.client.name,
});

export const formatProjectDetail = (project, role) => {
  const contacts = project.client.contacts.map((c) => {
    if (role === 'staff') {
      return { ...c };
    }
    const { email, phone, ...safe } = c;
    return safe;
  });

  return {
    id: project.id,
    name: project.name,
    address: project.address,
    status: project.status,
    clientName: project.client.name,
    dates: { ...project.dates },
    levels: [...project.levels],
    contacts,
  };
};
